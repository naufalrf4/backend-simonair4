import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SensorsService } from '../../sensors/sensors.service';
import { SensorDataRepository } from '../../sensors/sensor-data.repository';
import { SensorData } from '../../sensors/entities/sensor-data.entity';
import { ManualMeasurement } from '../entities/manual-measurement.entity';
import { MeasurementComparisonResponseDto } from '../dto/measurement-comparison-response.dto';
import { ComparisonCacheService } from './comparison-cache.service';
import {
  ComparisonFailedException,
  DatabaseOperationException,
} from '../exceptions/manual-measurement.exceptions';

export interface ComparisonResult {
  manual_value: number | null;
  sensor_value: number | null;
  difference: number | null;
  percentage_difference: number | null;
  accuracy_level: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'UNAVAILABLE';
  variance_flag: boolean;
}

export interface ComparisonReport {
  manual_measurement_id: string;
  device_id: string;
  comparison_timestamp: Date;
  sensor_data_timestamp: Date | null;
  time_window_minutes: number;
  temperature: ComparisonResult;
  ph: ComparisonResult;
  tds: ComparisonResult;
  do_level: ComparisonResult;
  overall_accuracy: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'UNAVAILABLE';
  accuracy_score: number;
  variance_count: number;
  notes: string | null;
}

export interface ComparisonStatistics {
  total_comparisons: number;
  successful_comparisons: number;
  accuracy_distribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
    unavailable: number;
  };
  average_accuracy_score: number;
  variance_rate: number;
  most_accurate_sensor: string | null;
  least_accurate_sensor: string | null;
}

@Injectable()
export class MeasurementComparisonService {
  private readonly logger = new Logger(MeasurementComparisonService.name);
  private readonly DEFAULT_TIME_WINDOW = 5; // minutes
  private readonly CACHE_TTL = 300; // 5 minutes in seconds

  // Accuracy thresholds for different sensor types
  private readonly ACCURACY_THRESHOLDS = {
    temperature: { excellent: 0.5, good: 1.0, fair: 2.0 },
    ph: { excellent: 0.1, good: 0.2, fair: 0.5 },
    tds: { excellent: 10, good: 25, fair: 50 },
    do_level: { excellent: 0.2, good: 0.5, fair: 1.0 },
  };

  // Variance thresholds for flagging significant differences
  private readonly VARIANCE_THRESHOLDS = {
    temperature: 3.0,
    ph: 0.8,
    tds: 100,
    do_level: 2.0,
  };

  constructor(
    private readonly sensorsService: SensorsService,
    private readonly sensorDataRepository: SensorDataRepository,
    private readonly configService: ConfigService,
    private readonly cacheService: ComparisonCacheService,
  ) {}

  /**
   * Find the closest sensor data to a given timestamp within a time window
   */
  async findClosestSensorData(
    deviceId: string,
    timestamp: Date,
    timeWindowMinutes: number = this.DEFAULT_TIME_WINDOW,
  ): Promise<SensorData | null> {
    try {
      const startTime = new Date(timestamp.getTime() - timeWindowMinutes * 60000);
      const endTime = new Date(timestamp.getTime() + timeWindowMinutes * 60000);

      this.logger.debug(
        `Finding closest sensor data for device ${deviceId} around ${timestamp.toISOString()}`,
        {
          deviceId,
          timestamp: timestamp.toISOString(),
          timeWindow: timeWindowMinutes,
          searchRange: {
            start: startTime.toISOString(),
            end: endTime.toISOString(),
          },
        },
      );

      // Get sensor data from the sensor repository directly
      const sensorData = await this.sensorDataRepository.findHistoricalData(
        deviceId,
        startTime,
        endTime,
      );

      if (!sensorData || sensorData.length === 0) {
        this.logger.warn(
          `No sensor data found for device ${deviceId} within ${timeWindowMinutes} minutes of ${timestamp.toISOString()}`,
          { deviceId, timestamp: timestamp.toISOString(), timeWindow: timeWindowMinutes },
        );
        return null;
      }

      // Find the closest timestamp
      const closestData = sensorData.reduce((closest, current) => {
        const currentDiff = Math.abs(current.time.getTime() - timestamp.getTime());
        const closestDiff = Math.abs(closest.time.getTime() - timestamp.getTime());
        return currentDiff < closestDiff ? current : closest;
      });

      const timeDifferenceMinutes = Math.abs(
        closestData.time.getTime() - timestamp.getTime(),
      ) / 60000;

      this.logger.debug(
        `Found closest sensor data for device ${deviceId}`,
        {
          deviceId,
          targetTimestamp: timestamp.toISOString(),
          foundTimestamp: closestData.time.toISOString(),
          timeDifferenceMinutes: timeDifferenceMinutes.toFixed(2),
        },
      );

      return closestData;
    } catch (error) {
      this.logger.error(
        `Failed to find closest sensor data for device ${deviceId}`,
        {
          error: error.message,
          deviceId,
          timestamp: timestamp.toISOString(),
          timeWindow: timeWindowMinutes,
        },
      );
      throw new DatabaseOperationException(
        'SENSOR_DATA_LOOKUP',
        error as Error,
        this.generateCorrelationId(),
        { deviceId, timestamp: timestamp.toISOString(), timeWindow: timeWindowMinutes },
      );
    }
  }

  /**
   * Calculate differences between manual measurement and sensor data
   */
  calculateDifferences(
    manualMeasurement: ManualMeasurement,
    sensorData: SensorData | null,
  ): {
    temperature: ComparisonResult;
    ph: ComparisonResult;
    tds: ComparisonResult;
    do_level: ComparisonResult;
  } {
    try {
      const results = {
        temperature: this.calculateSensorComparison(
          'temperature',
          manualMeasurement.temperature,
          sensorData?.temperature?.value || null,
        ),
        ph: this.calculateSensorComparison(
          'ph',
          manualMeasurement.ph,
          sensorData?.ph?.value || null,
        ),
        tds: this.calculateSensorComparison(
          'tds',
          manualMeasurement.tds,
          sensorData?.tds?.value || null,
        ),
        do_level: this.calculateSensorComparison(
          'do_level',
          manualMeasurement.do_level,
          sensorData?.do_level?.value || null,
        ),
      };

      this.logger.debug(
        `Calculated differences for manual measurement ${manualMeasurement.id}`,
        {
          measurementId: manualMeasurement.id,
          deviceId: manualMeasurement.device_id,
          sensorDataAvailable: !!sensorData,
          results,
        },
      );

      return results;
    } catch (error) {
      this.logger.error(
        `Failed to calculate differences for manual measurement ${manualMeasurement.id}`,
        {
          error: error.message,
          measurementId: manualMeasurement.id,
          deviceId: manualMeasurement.device_id,
        },
      );
      throw new ComparisonFailedException(
        `Failed to calculate measurement differences: ${error.message}`,
        this.generateCorrelationId(),
        { measurementId: manualMeasurement.id, deviceId: manualMeasurement.device_id },
      );
    }
  }

  /**
   * Assess accuracy level for a comparison result
   */
  assessAccuracy(
    sensorType: 'temperature' | 'ph' | 'tds' | 'do_level',
    difference: number | null,
  ): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'UNAVAILABLE' {
    if (difference === null) {
      return 'UNAVAILABLE';
    }

    const thresholds = this.ACCURACY_THRESHOLDS[sensorType];
    const absDiff = Math.abs(difference);

    if (absDiff <= thresholds.excellent) return 'EXCELLENT';
    if (absDiff <= thresholds.good) return 'GOOD';
    if (absDiff <= thresholds.fair) return 'FAIR';
    return 'POOR';
  }

  /**
   * Generate a comprehensive comparison report with caching support
   */
  async generateComparisonReport(
    manualMeasurement: ManualMeasurement,
    timeWindowMinutes: number = this.DEFAULT_TIME_WINDOW,
    useCache: boolean = true,
  ): Promise<ComparisonReport> {
    // Check cache first if enabled
    if (useCache) {
      const cachedReport = this.cacheService.get(manualMeasurement.id, timeWindowMinutes);
      if (cachedReport) {
        this.logger.debug(
          `Using cached comparison report for manual measurement ${manualMeasurement.id}`,
          {
            measurementId: manualMeasurement.id,
            deviceId: manualMeasurement.device_id,
            timeWindow: timeWindowMinutes,
          },
        );
        return cachedReport;
      }
    }

    try {
      const sensorData = await this.findClosestSensorData(
        manualMeasurement.device_id,
        manualMeasurement.measurement_timestamp,
        timeWindowMinutes,
      );

      const differences = this.calculateDifferences(manualMeasurement, sensorData);

      const accuracyLevels = [
        differences.temperature.accuracy_level,
        differences.ph.accuracy_level,
        differences.tds.accuracy_level,
        differences.do_level.accuracy_level,
      ];

      const overallAccuracy = this.calculateOverallAccuracy(accuracyLevels);
      const accuracyScore = this.calculateAccuracyScore(differences);
      const varianceCount = this.countVarianceFlags(differences);

      const report: ComparisonReport = {
        manual_measurement_id: manualMeasurement.id,
        device_id: manualMeasurement.device_id,
        comparison_timestamp: new Date(),
        sensor_data_timestamp: sensorData?.time || null,
        time_window_minutes: timeWindowMinutes,
        temperature: differences.temperature,
        ph: differences.ph,
        tds: differences.tds,
        do_level: differences.do_level,
        overall_accuracy: overallAccuracy,
        accuracy_score: accuracyScore,
        variance_count: varianceCount,
        notes: this.generateComparisonNotes(differences, sensorData),
      };

      // Cache the report if enabled
      if (useCache) {
        this.cacheService.set(manualMeasurement.id, timeWindowMinutes, report, this.CACHE_TTL * 1000);
      }

      this.logger.debug(
        `Generated comparison report for manual measurement ${manualMeasurement.id}`,
        {
          measurementId: manualMeasurement.id,
          deviceId: manualMeasurement.device_id,
          overallAccuracy,
          accuracyScore,
          varianceCount,
          sensorDataFound: !!sensorData,
          cached: useCache,
        },
      );

      return report;
    } catch (error) {
      this.logger.error(
        `Failed to generate comparison report for manual measurement ${manualMeasurement.id}`,
        {
          error: error.message,
          measurementId: manualMeasurement.id,
          deviceId: manualMeasurement.device_id,
        },
      );
      throw new ComparisonFailedException(
        `Failed to generate comparison report: ${error.message}`,
        this.generateCorrelationId(),
        { measurementId: manualMeasurement.id, deviceId: manualMeasurement.device_id },
      );
    }
  }

  /**
   * Calculate comparison statistics for a set of measurements
   */
  async calculateComparisonStatistics(
    manualMeasurements: ManualMeasurement[],
    timeWindowMinutes: number = this.DEFAULT_TIME_WINDOW,
  ): Promise<ComparisonStatistics> {
    try {
      const reports = await Promise.all(
        manualMeasurements.map(measurement =>
          this.generateComparisonReport(measurement, timeWindowMinutes),
        ),
      );

      const successfulComparisons = reports.filter(r => r.sensor_data_timestamp !== null);
      const accuracyDistribution = this.calculateAccuracyDistribution(reports);
      const averageAccuracyScore = this.calculateAverageAccuracyScore(reports);
      const varianceRate = this.calculateVarianceRate(reports);

      const statistics: ComparisonStatistics = {
        total_comparisons: reports.length,
        successful_comparisons: successfulComparisons.length,
        accuracy_distribution: accuracyDistribution,
        average_accuracy_score: averageAccuracyScore,
        variance_rate: varianceRate,
        most_accurate_sensor: this.findMostAccurateSensor(reports),
        least_accurate_sensor: this.findLeastAccurateSensor(reports),
      };

      this.logger.debug(
        `Calculated comparison statistics for ${manualMeasurements.length} measurements`,
        {
          totalMeasurements: manualMeasurements.length,
          successfulComparisons: successfulComparisons.length,
          averageAccuracyScore,
          varianceRate,
        },
      );

      return statistics;
    } catch (error) {
      this.logger.error(
        `Failed to calculate comparison statistics`,
        {
          error: error.message,
          measurementCount: manualMeasurements.length,
        },
      );
      throw new ComparisonFailedException(
        `Failed to calculate comparison statistics: ${error.message}`,
        this.generateCorrelationId(),
        { measurementCount: manualMeasurements.length },
      );
    }
  }

  /**
   * Clear cached comparison results for a specific measurement
   */
  clearComparisonCache(measurementId: string): number {
    const deletedCount = this.cacheService.clearMeasurement(measurementId);
    
    this.logger.debug(
      `Cleared comparison cache for measurement ${measurementId}`,
      {
        measurementId,
        deletedCount,
      },
    );

    return deletedCount;
  }

  /**
   * Clear all expired cache entries
   */
  clearExpiredCache(): number {
    const deletedCount = this.cacheService.clearExpired();
    
    if (deletedCount > 0) {
      this.logger.debug(
        `Cleared ${deletedCount} expired comparison cache entries`,
        {
          deletedCount,
        },
      );
    }

    return deletedCount;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number;
    expiredEntries: number;
    memoryUsage: number;
  } {
    return this.cacheService.getStats();
  }

  // Private helper methods

  private calculateSensorComparison(
    sensorType: 'temperature' | 'ph' | 'tds' | 'do_level',
    manualValue: number | null,
    sensorValue: number | null,
  ): ComparisonResult {
    if (manualValue === null && sensorValue === null) {
      return {
        manual_value: null,
        sensor_value: null,
        difference: null,
        percentage_difference: null,
        accuracy_level: 'UNAVAILABLE',
        variance_flag: false,
      };
    }

    if (manualValue === null || sensorValue === null) {
      return {
        manual_value: manualValue,
        sensor_value: sensorValue,
        difference: null,
        percentage_difference: null,
        accuracy_level: 'UNAVAILABLE',
        variance_flag: false,
      };
    }

    const difference = manualValue - sensorValue;
    const percentageDifference = sensorValue !== 0 ? (difference / sensorValue) * 100 : null;
    const accuracyLevel = this.assessAccuracy(sensorType, difference);
    const varianceFlag = Math.abs(difference) > this.VARIANCE_THRESHOLDS[sensorType];

    return {
      manual_value: manualValue,
      sensor_value: sensorValue,
      difference,
      percentage_difference: percentageDifference,
      accuracy_level: accuracyLevel,
      variance_flag: varianceFlag,
    };
  }

  private calculateOverallAccuracy(
    accuracyLevels: Array<'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'UNAVAILABLE'>,
  ): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'UNAVAILABLE' {
    const validLevels = accuracyLevels.filter(level => level !== 'UNAVAILABLE');
    
    if (validLevels.length === 0) {
      return 'UNAVAILABLE';
    }

    const weights = { EXCELLENT: 4, GOOD: 3, FAIR: 2, POOR: 1, UNAVAILABLE: 0 };
    const totalWeight = validLevels.reduce((sum, level) => sum + weights[level], 0);
    const averageWeight = totalWeight / validLevels.length;

    if (averageWeight >= 3.5) return 'EXCELLENT';
    if (averageWeight >= 2.5) return 'GOOD';
    if (averageWeight >= 1.5) return 'FAIR';
    return 'POOR';
  }

  private calculateAccuracyScore(differences: {
    temperature: ComparisonResult;
    ph: ComparisonResult;
    tds: ComparisonResult;
    do_level: ComparisonResult;
  }): number {
    const weights = { EXCELLENT: 100, GOOD: 80, FAIR: 60, POOR: 40, UNAVAILABLE: 0 };
    const validResults = Object.values(differences).filter(
      result => result.accuracy_level !== 'UNAVAILABLE',
    );

    if (validResults.length === 0) {
      return 0;
    }

    const totalScore = validResults.reduce(
      (sum, result) => sum + weights[result.accuracy_level],
      0,
    );

    return totalScore / validResults.length;
  }

  private countVarianceFlags(differences: {
    temperature: ComparisonResult;
    ph: ComparisonResult;
    tds: ComparisonResult;
    do_level: ComparisonResult;
  }): number {
    return Object.values(differences).filter(result => result.variance_flag).length;
  }

  private generateComparisonNotes(
    differences: {
      temperature: ComparisonResult;
      ph: ComparisonResult;
      tds: ComparisonResult;
      do_level: ComparisonResult;
    },
    sensorData: SensorData | null,
  ): string | null {
    const notes: string[] = [];

    if (!sensorData) {
      notes.push('No sensor data available for comparison');
      return notes.join('. ');
    }

    const varianceResults = Object.entries(differences).filter(
      ([, result]) => result.variance_flag,
    );

    if (varianceResults.length > 0) {
      const varianceSensors = varianceResults.map(([sensor]) => sensor).join(', ');
      notes.push(`Significant variance detected in: ${varianceSensors}`);
    }

    const poorResults = Object.entries(differences).filter(
      ([, result]) => result.accuracy_level === 'POOR',
    );

    if (poorResults.length > 0) {
      const poorSensors = poorResults.map(([sensor]) => sensor).join(', ');
      notes.push(`Poor accuracy in: ${poorSensors}`);
    }

    return notes.length > 0 ? notes.join('. ') : null;
  }

  private calculateAccuracyDistribution(reports: ComparisonReport[]): {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
    unavailable: number;
  } {
    const distribution = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
      unavailable: 0,
    };

    reports.forEach(report => {
      switch (report.overall_accuracy) {
        case 'EXCELLENT':
          distribution.excellent++;
          break;
        case 'GOOD':
          distribution.good++;
          break;
        case 'FAIR':
          distribution.fair++;
          break;
        case 'POOR':
          distribution.poor++;
          break;
        case 'UNAVAILABLE':
          distribution.unavailable++;
          break;
      }
    });

    return distribution;
  }

  private calculateAverageAccuracyScore(reports: ComparisonReport[]): number {
    const validReports = reports.filter(r => r.accuracy_score > 0);
    if (validReports.length === 0) return 0;

    const totalScore = validReports.reduce((sum, report) => sum + report.accuracy_score, 0);
    return totalScore / validReports.length;
  }

  private calculateVarianceRate(reports: ComparisonReport[]): number {
    const validReports = reports.filter(r => r.sensor_data_timestamp !== null);
    if (validReports.length === 0) return 0;

    const reportsWithVariance = validReports.filter(r => r.variance_count > 0);
    return (reportsWithVariance.length / validReports.length) * 100;
  }

  private findMostAccurateSensor(reports: ComparisonReport[]): string | null {
    const sensorScores: {
      temperature: number[];
      ph: number[];
      tds: number[];
      do_level: number[];
    } = {
      temperature: [],
      ph: [],
      tds: [],
      do_level: [],
    };

    reports.forEach(report => {
      if (report.temperature.accuracy_level !== 'UNAVAILABLE') {
        sensorScores.temperature.push(this.getAccuracyScore(report.temperature.accuracy_level));
      }
      if (report.ph.accuracy_level !== 'UNAVAILABLE') {
        sensorScores.ph.push(this.getAccuracyScore(report.ph.accuracy_level));
      }
      if (report.tds.accuracy_level !== 'UNAVAILABLE') {
        sensorScores.tds.push(this.getAccuracyScore(report.tds.accuracy_level));
      }
      if (report.do_level.accuracy_level !== 'UNAVAILABLE') {
        sensorScores.do_level.push(this.getAccuracyScore(report.do_level.accuracy_level));
      }
    });

    const averageScores = Object.entries(sensorScores).map(([sensor, scores]) => ({
      sensor,
      averageScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
    }));

    const mostAccurate = averageScores.reduce((prev, current) =>
      current.averageScore > prev.averageScore ? current : prev,
    );

    return mostAccurate.averageScore > 0 ? mostAccurate.sensor : null;
  }

  private findLeastAccurateSensor(reports: ComparisonReport[]): string | null {
    const sensorScores: {
      temperature: number[];
      ph: number[];
      tds: number[];
      do_level: number[];
    } = {
      temperature: [],
      ph: [],
      tds: [],
      do_level: [],
    };

    reports.forEach(report => {
      if (report.temperature.accuracy_level !== 'UNAVAILABLE') {
        sensorScores.temperature.push(this.getAccuracyScore(report.temperature.accuracy_level));
      }
      if (report.ph.accuracy_level !== 'UNAVAILABLE') {
        sensorScores.ph.push(this.getAccuracyScore(report.ph.accuracy_level));
      }
      if (report.tds.accuracy_level !== 'UNAVAILABLE') {
        sensorScores.tds.push(this.getAccuracyScore(report.tds.accuracy_level));
      }
      if (report.do_level.accuracy_level !== 'UNAVAILABLE') {
        sensorScores.do_level.push(this.getAccuracyScore(report.do_level.accuracy_level));
      }
    });

    const averageScores = Object.entries(sensorScores).map(([sensor, scores]) => ({
      sensor,
      averageScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
    }));

    const validScores = averageScores.filter(s => s.averageScore > 0);
    if (validScores.length === 0) return null;

    const leastAccurate = validScores.reduce((prev, current) =>
      current.averageScore < prev.averageScore ? current : prev,
    );

    return leastAccurate.sensor;
  }

  private getAccuracyScore(level: string): number {
    switch (level) {
      case 'EXCELLENT': return 100;
      case 'GOOD': return 80;
      case 'FAIR': return 60;
      case 'POOR': return 40;
      default: return 0;
    }
  }

  private generateCorrelationId(): string {
    return `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
