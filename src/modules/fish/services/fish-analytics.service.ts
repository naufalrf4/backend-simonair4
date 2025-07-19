import { Injectable, Logger } from '@nestjs/common';
import { FishGrowthRepository, GrowthStatistics } from '../fish-growth.repository';
import { FishGrowth } from '../entities/fish-growth.entity';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import { FishAnalyticsResponseDto } from '../dto/fish-analytics-response.dto';
import { FishCacheService } from './fish-cache.service';
import {
  InsufficientDataException,
  AnalyticsCalculationException,
  DatabaseOperationException,
} from '../exceptions';

export interface GrowthRateResult {
  deviceId: string;
  growthRate: number; // cm per day
  weightGrowthRate: number; // g per day
  period: {
    start: Date;
    end: Date;
    days: number;
  };
  dataPoints: number;
}

export interface TrendAnalysis {
  trend: 'increasing' | 'decreasing' | 'stable';
  slope: number;
  correlation: number;
  confidence: number;
  periodAnalysis: {
    recentTrend: 'improving' | 'declining' | 'stable';
    volatility: number;
    consistency: number;
  };
}

export interface DeviceMetrics {
  deviceId: string;
  growthRate: number;
  consistency: number;
  healthScore: number;
  efficiency: number;
  overallScore: number;
}

export interface GrowthPrediction {
  deviceId: string;
  predictions: Array<{
    date: Date;
    predictedLength: number;
    predictedWeight: number;
    confidence: number;
  }>;
  algorithm: string;
  accuracy: number;
  parameters: Record<string, any>;
}

export interface ComprehensiveStatistics {
  basic: {
    totalMeasurements: number;
    uniqueDevices: number;
    timespan: number; // days
    averageFrequency: number; // measurements per day
  };
  growth: {
    averageLengthGrowth: number;
    averageWeightGrowth: number;
    fastestGrowingDevice: string;
    slowestGrowingDevice: string;
    growthVariability: number;
  };
  health: {
    averageConditionScore: number;
    healthyPercentage: number;
    conditionDistribution: Record<string, number>;
  };
  biomass: {
    totalBiomass: number;
    averageBiomass: number;
    biomassGrowthRate: number;
    projectedBiomass: number;
  };
}

export interface PerformanceComparison {
  devices: Array<{
    deviceId: string;
    rank: number;
    score: number;
    metrics: {
      growthRate: number;
      consistency: number;
      healthScore: number;
      efficiency: number;
    };
    comparison: {
      vsAverage: number;
      vsBest: number;
      percentile: number;
    };
  }>;
  averageMetrics: {
    growthRate: number;
    consistency: number;
    healthScore: number;
    efficiency: number;
  };
  recommendations: Array<{
    deviceId: string;
    priority: 'high' | 'medium' | 'low';
    recommendation: string;
    expectedImprovement: number;
  }>;
}

@Injectable()
export class FishAnalyticsService {
  private readonly logger = new Logger(FishAnalyticsService.name);

  constructor(
    private readonly fishGrowthRepository: FishGrowthRepository,
    private readonly cacheService: FishCacheService,
  ) {}

  /**
   * Calculate growth rate for devices
   */
  async calculateGrowthRate(
    deviceIds: string[],
    startDate?: Date,
    endDate?: Date,
    correlationId?: string,
  ): Promise<GrowthRateResult[]> {
    try {
      const cacheKey = this.cacheService.generateAnalyticsKey(deviceIds, startDate, endDate);
      const cached = this.cacheService.get<GrowthRateResult[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const results: GrowthRateResult[] = [];

      for (const deviceId of deviceIds) {
        const records = await this.fishGrowthRepository.findByDateRange(
          startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Default 90 days
          endDate || new Date(),
          [deviceId],
          correlationId,
        );

        if (records.length < 2) {
          throw new InsufficientDataException(
            'growth rate calculation',
            2,
            records.length,
            correlationId,
            { deviceId },
          );
        }

        const sortedRecords = records.sort((a, b) => 
          new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime()
        );

        const firstRecord = sortedRecords[0];
        const lastRecord = sortedRecords[sortedRecords.length - 1];

        const periodDays = Math.ceil(
          (new Date(lastRecord.measurement_date).getTime() - new Date(firstRecord.measurement_date).getTime()) / 
          (1000 * 60 * 60 * 24)
        );

        if (periodDays <= 0) {
          throw new AnalyticsCalculationException(
            'growth rate calculation',
            'Invalid time period',
            correlationId,
            { deviceId, periodDays },
          );
        }

        const lengthDiff = (lastRecord.length_cm || 0) - (firstRecord.length_cm || 0);
        const weightDiff = (lastRecord.weight_gram || 0) - (firstRecord.weight_gram || 0);

        const growthRate = lengthDiff / periodDays;
        const weightGrowthRate = weightDiff / periodDays;

        results.push({
          deviceId,
          growthRate,
          weightGrowthRate,
          period: {
            start: new Date(firstRecord.measurement_date),
            end: new Date(lastRecord.measurement_date),
            days: periodDays,
          },
          dataPoints: records.length,
        });
      }

      this.cacheService.set(cacheKey, results, 10 * 60 * 1000); // 10 minutes cache
      return results;
    } catch (error) {
      if (error instanceof InsufficientDataException || error instanceof AnalyticsCalculationException) {
        throw error;
      }
      throw new AnalyticsCalculationException(
        'growth rate calculation',
        error.message,
        correlationId,
        { deviceIds, startDate, endDate },
      );
    }
  }

  /**
   * Calculate trend analysis with statistical metrics
   */
  async calculateTrendAnalysis(
    deviceId: string,
    startDate?: Date,
    endDate?: Date,
    correlationId?: string,
  ): Promise<TrendAnalysis> {
    try {
      const cacheKey = this.cacheService.generateTrendsKey(deviceId, `${startDate?.toISOString()}_${endDate?.toISOString()}`);
      const cached = this.cacheService.get<TrendAnalysis>(cacheKey);
      if (cached) {
        return cached;
      }

      const records = await this.fishGrowthRepository.findByDateRange(
        startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        endDate || new Date(),
        [deviceId],
        correlationId,
      );

      if (records.length < 3) {
        throw new InsufficientDataException(
          'trend analysis',
          3,
          records.length,
          correlationId,
          { deviceId },
        );
      }

      const sortedRecords = records.sort((a, b) => 
        new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime()
      );

      // Calculate linear regression for trend
      const dataPoints = sortedRecords.map((record, index) => ({
        x: index,
        y: record.length_cm || 0,
        weight: record.weight_gram || 0,
      }));

      const regression = this.calculateLinearRegression(dataPoints);
      const correlation = this.calculateCorrelation(dataPoints);

      // Recent trend analysis (last 30% of data)
      const recentCount = Math.ceil(sortedRecords.length * 0.3);
      const recentRecords = sortedRecords.slice(-recentCount);
      const recentDataPoints = recentRecords.map((record, index) => ({
        x: index,
        y: record.length_cm || 0,
        weight: record.weight_gram || 0,
      }));

      const recentRegression = this.calculateLinearRegression(recentDataPoints);
      const volatility = this.calculateVolatility(dataPoints);
      const consistency = this.calculateConsistency(dataPoints);

      const result: TrendAnalysis = {
        trend: regression.slope > 0.1 ? 'increasing' : regression.slope < -0.1 ? 'decreasing' : 'stable',
        slope: regression.slope,
        correlation: correlation,
        confidence: Math.min(0.95, Math.max(0.5, Math.abs(correlation))),
        periodAnalysis: {
          recentTrend: recentRegression.slope > regression.slope ? 'improving' : 
                      recentRegression.slope < regression.slope ? 'declining' : 'stable',
          volatility,
          consistency,
        },
      };

      this.cacheService.set(cacheKey, result, 15 * 60 * 1000); // 15 minutes cache
      return result;
    } catch (error) {
      if (error instanceof InsufficientDataException) {
        throw error;
      }
      throw new AnalyticsCalculationException(
        'trend analysis',
        error.message,
        correlationId,
        { deviceId, startDate, endDate },
      );
    }
  }

  /**
   * Generate growth predictions using linear regression
   */
  async generatePredictions(
    deviceId: string,
    daysAhead: number = 30,
    correlationId?: string,
  ): Promise<GrowthPrediction> {
    try {
      const cacheKey = this.cacheService.generatePredictionsKey(deviceId, daysAhead);
      const cached = this.cacheService.get<GrowthPrediction>(cacheKey);
      if (cached) {
        return cached;
      }

      const records = await this.fishGrowthRepository.findLatestByDevice(
        deviceId,
        50, // Use last 50 records for prediction
        correlationId,
      );

      if (records.length < 5) {
        throw new InsufficientDataException(
          'growth predictions',
          5,
          records.length,
          correlationId,
          { deviceId },
        );
      }

      const sortedRecords = records.sort((a, b) => 
        new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime()
      );

      const dataPoints = sortedRecords.map((record, index) => ({
        x: index,
        y: record.length_cm || 0,
        weight: record.weight_gram || 0,
      }));

      const lengthRegression = this.calculateLinearRegression(dataPoints);
      const weightRegression = this.calculateLinearRegression(
        dataPoints.map(p => ({ x: p.x, y: p.weight, weight: p.weight }))
      );

      const predictions: Array<{
        date: Date;
        predictedLength: number;
        predictedWeight: number;
        confidence: number;
      }> = [];
      const lastIndex = dataPoints.length - 1;
      const lastDate = new Date(sortedRecords[sortedRecords.length - 1].measurement_date);

      for (let i = 1; i <= daysAhead; i++) {
        const futureIndex = lastIndex + i;
        const futureDate = new Date(lastDate.getTime() + i * 24 * 60 * 60 * 1000);
        
        const predictedLength = lengthRegression.slope * futureIndex + lengthRegression.intercept;
        const predictedWeight = weightRegression.slope * futureIndex + weightRegression.intercept;
        
        // Confidence decreases with distance into future
        const confidence = Math.max(0.3, 0.9 - (i / daysAhead) * 0.6);

        predictions.push({
          date: futureDate,
          predictedLength: Math.max(0, predictedLength),
          predictedWeight: Math.max(0, predictedWeight),
          confidence,
        });
      }

      const accuracy = this.calculatePredictionAccuracy(lengthRegression, dataPoints);

      const result: GrowthPrediction = {
        deviceId,
        predictions,
        algorithm: 'linear_regression',
        accuracy,
        parameters: {
          lengthSlope: lengthRegression.slope,
          lengthIntercept: lengthRegression.intercept,
          weightSlope: weightRegression.slope,
          weightIntercept: weightRegression.intercept,
          dataPoints: records.length,
        },
      };

      this.cacheService.set(cacheKey, result, 30 * 60 * 1000); // 30 minutes cache for predictions
      return result;
    } catch (error) {
      if (error instanceof InsufficientDataException) {
        throw error;
      }
      throw new AnalyticsCalculationException(
        'growth predictions',
        error.message,
        correlationId,
        { deviceId, daysAhead },
      );
    }
  }

  /**
   * Calculate comprehensive statistics
   */
  async calculateStatistics(
    deviceIds?: string[],
    startDate?: Date,
    endDate?: Date,
    correlationId?: string,
  ): Promise<ComprehensiveStatistics> {
    try {
      const cacheKey = this.cacheService.generateGrowthStatsKey(deviceIds, startDate, endDate);
      const cached = this.cacheService.get<ComprehensiveStatistics>(cacheKey);
      if (cached) {
        return cached;
      }

      const growthStats = await this.fishGrowthRepository.getGrowthStatistics(
        deviceIds,
        startDate,
        endDate,
        correlationId,
      );

      const records = await this.fishGrowthRepository.findByDateRange(
        startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        endDate || new Date(),
        deviceIds,
        correlationId,
      );

      if (records.length === 0) {
        throw new InsufficientDataException(
          'comprehensive statistics',
          1,
          0,
          correlationId,
          { deviceIds, startDate, endDate },
        );
      }

      const timespan = Math.ceil(
        (growthStats.dateRange.latest.getTime() - growthStats.dateRange.earliest.getTime()) / 
        (1000 * 60 * 60 * 24)
      );

      // Calculate device-specific growth rates
      const deviceGrowthRates = new Map<string, number>();
      const uniqueDevices = Array.from(new Set(records.map(r => r.device_id)));

      for (const deviceId of uniqueDevices) {
        const deviceRecords = records.filter(r => r.device_id === deviceId);
        if (deviceRecords.length >= 2) {
          const sorted = deviceRecords.sort((a, b) => 
            new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime()
          );
          const first = sorted[0];
          const last = sorted[sorted.length - 1];
          const days = Math.ceil(
            (new Date(last.measurement_date).getTime() - new Date(first.measurement_date).getTime()) / 
            (1000 * 60 * 60 * 24)
          );
          if (days > 0) {
            const growthRate = ((last.length_cm || 0) - (first.length_cm || 0)) / days;
            deviceGrowthRates.set(deviceId, growthRate);
          }
        }
      }

      const growthRates = Array.from(deviceGrowthRates.values());
      const fastestDevice = Array.from(deviceGrowthRates.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0] || '';
      const slowestDevice = Array.from(deviceGrowthRates.entries())
        .sort((a, b) => a[1] - b[1])[0]?.[0] || '';

      // Health analysis
      const conditionCounts = growthStats.growthMetrics.conditionIndicators;
      const totalWithCondition = Object.values(conditionCounts).reduce((a, b) => a + b, 0);
      const healthyCount = (conditionCounts['Good'] || 0) + (conditionCounts['Excellent'] || 0);
      const healthyPercentage = totalWithCondition > 0 ? (healthyCount / totalWithCondition) * 100 : 0;

      const conditionScores = {
        'Poor': 1,
        'Good': 2,
        'Excellent': 3,
      };

      const averageConditionScore = totalWithCondition > 0 
        ? Object.entries(conditionCounts).reduce((sum, [condition, count]) => 
            sum + (conditionScores[condition] || 0) * count, 0) / totalWithCondition
        : 0;

      const result: ComprehensiveStatistics = {
        basic: {
          totalMeasurements: records.length,
          uniqueDevices: uniqueDevices.length,
          timespan,
          averageFrequency: timespan > 0 ? records.length / timespan : 0,
        },
        growth: {
          averageLengthGrowth: growthRates.length > 0 ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length : 0,
          averageWeightGrowth: growthStats.growthMetrics.avgGrowthRate,
          fastestGrowingDevice: fastestDevice,
          slowestGrowingDevice: slowestDevice,
          growthVariability: this.calculateVariability(growthRates),
        },
        health: {
          averageConditionScore,
          healthyPercentage,
          conditionDistribution: conditionCounts,
        },
        biomass: {
          totalBiomass: growthStats.growthMetrics.totalBiomass,
          averageBiomass: growthStats.measurementSummary.avgBiomass,
          biomassGrowthRate: this.calculateBiomassGrowthRate(records),
          projectedBiomass: this.projectBiomass(records),
        },
      };

      this.cacheService.set(cacheKey, result, 20 * 60 * 1000); // 20 minutes cache
      return result;
    } catch (error) {
      if (error instanceof InsufficientDataException) {
        throw error;
      }
      throw new AnalyticsCalculationException(
        'comprehensive statistics',
        error.message,
        correlationId,
        { deviceIds, startDate, endDate },
      );
    }
  }

  /**
   * Compare performance across devices
   */
  async comparePerformance(
    deviceIds: string[],
    startDate?: Date,
    endDate?: Date,
    correlationId?: string,
  ): Promise<PerformanceComparison> {
    try {
      const cacheKey = `performance_${deviceIds.join(',')}_${startDate?.toISOString()}_${endDate?.toISOString()}`;
      const cached = this.cacheService.get<PerformanceComparison>(cacheKey);
      if (cached) {
        return cached;
      }

      const deviceMetrics: DeviceMetrics[] = [];
      const growthRates = await this.calculateGrowthRate(deviceIds, startDate, endDate, correlationId);

      for (const deviceId of deviceIds) {
        const records = await this.fishGrowthRepository.findByDateRange(
          startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          endDate || new Date(),
          [deviceId],
          correlationId,
        );

        if (records.length === 0) continue;

        const deviceGrowthRate = growthRates.find(gr => gr.deviceId === deviceId);
        const growthRate = deviceGrowthRate?.growthRate || 0;

        const consistency = this.calculateConsistency(
          records.map((r, i) => ({ x: i, y: r.length_cm || 0, weight: r.weight_gram || 0 }))
        );

        const healthScore = this.calculateHealthScore(records);
        const efficiency = this.calculateEfficiency(records);

        const overallScore = (growthRate * 0.4) + (consistency * 0.3) + (healthScore * 0.2) + (efficiency * 0.1);

        deviceMetrics.push({
          deviceId,
          growthRate,
          consistency,
          healthScore,
          efficiency,
          overallScore,
        });
      }

      // Sort by overall score
      deviceMetrics.sort((a, b) => b.overallScore - a.overallScore);

      const averageMetrics = {
        growthRate: deviceMetrics.reduce((sum, d) => sum + d.growthRate, 0) / deviceMetrics.length,
        consistency: deviceMetrics.reduce((sum, d) => sum + d.consistency, 0) / deviceMetrics.length,
        healthScore: deviceMetrics.reduce((sum, d) => sum + d.healthScore, 0) / deviceMetrics.length,
        efficiency: deviceMetrics.reduce((sum, d) => sum + d.efficiency, 0) / deviceMetrics.length,
      };

      const bestScore = deviceMetrics[0]?.overallScore || 0;

      const devices = deviceMetrics.map((metrics, index) => ({
        deviceId: metrics.deviceId,
        rank: index + 1,
        score: metrics.overallScore,
        metrics: {
          growthRate: metrics.growthRate,
          consistency: metrics.consistency,
          healthScore: metrics.healthScore,
          efficiency: metrics.efficiency,
        },
        comparison: {
          vsAverage: metrics.overallScore - (deviceMetrics.reduce((sum, d) => sum + d.overallScore, 0) / deviceMetrics.length),
          vsBest: metrics.overallScore - bestScore,
          percentile: ((deviceMetrics.length - index) / deviceMetrics.length) * 100,
        },
      }));

      const recommendations = this.generateRecommendations(devices);

      const result: PerformanceComparison = {
        devices,
        averageMetrics,
        recommendations,
      };

      this.cacheService.set(cacheKey, result, 25 * 60 * 1000); // 25 minutes cache
      return result;
    } catch (error) {
      throw new AnalyticsCalculationException(
        'performance comparison',
        error.message,
        correlationId,
        { deviceIds, startDate, endDate },
      );
    }
  }


  /**
   * Calculate linear regression
   */
  private calculateLinearRegression(points: Array<{ x: number; y: number }>): { slope: number; intercept: number } {
    const n = points.length;
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  /**
   * Calculate correlation coefficient
   */
  private calculateCorrelation(points: Array<{ x: number; y: number }>): number {
    const n = points.length;
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0);
    const sumYY = points.reduce((sum, p) => sum + p.y * p.y, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Calculate volatility
   */
  private calculateVolatility(points: Array<{ x: number; y: number }>): number {
    if (points.length < 2) return 0;

    const values = points.map(p => p.y);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance) / mean;
  }

  /**
   * Calculate consistency
   */
  private calculateConsistency(points: Array<{ x: number; y: number }>): number {
    if (points.length < 2) return 0;

    const regression = this.calculateLinearRegression(points);
    const predictions = points.map(p => regression.slope * p.x + regression.intercept);
    const errors = points.map((p, i) => Math.abs(p.y - predictions[i]));
    const meanError = errors.reduce((sum, err) => sum + err, 0) / errors.length;
    const meanValue = points.reduce((sum, p) => sum + p.y, 0) / points.length;

    return Math.max(0, 1 - (meanError / meanValue));
  }

  /**
   * Calculate prediction accuracy
   */
  private calculatePredictionAccuracy(regression: { slope: number; intercept: number }, points: Array<{ x: number; y: number }>): number {
    const predictions = points.map(p => regression.slope * p.x + regression.intercept);
    const errors = points.map((p, i) => Math.abs(p.y - predictions[i]));
    const meanError = errors.reduce((sum, err) => sum + err, 0) / errors.length;
    const meanValue = points.reduce((sum, p) => sum + p.y, 0) / points.length;

    return Math.max(0, 1 - (meanError / meanValue));
  }

  /**
   * Calculate variability
   */
  private calculateVariability(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Calculate biomass growth rate
   */
  private calculateBiomassGrowthRate(records: FishGrowth[]): number {
    if (records.length < 2) return 0;

    const withBiomass = records.filter(r => r.biomass_kg != null);
    if (withBiomass.length < 2) return 0;

    const sorted = withBiomass.sort((a, b) => 
      new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime()
    );

    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const days = Math.ceil(
      (new Date(last.measurement_date).getTime() - new Date(first.measurement_date).getTime()) / 
      (1000 * 60 * 60 * 24)
    );

    return days > 0 ? ((last.biomass_kg || 0) - (first.biomass_kg || 0)) / days : 0;
  }

  /**
   * Project future biomass
   */
  private projectBiomass(records: FishGrowth[]): number {
    const biomassGrowthRate = this.calculateBiomassGrowthRate(records);
    const latestBiomass = records
      .filter(r => r.biomass_kg != null)
      .sort((a, b) => new Date(b.measurement_date).getTime() - new Date(a.measurement_date).getTime())[0]?.biomass_kg || 0;

    // Project 30 days ahead
    return latestBiomass + (biomassGrowthRate * 30);
  }

  /**
   * Calculate health score
   */
  private calculateHealthScore(records: FishGrowth[]): number {
    const withCondition = records.filter(r => r.condition_indicator);
    if (withCondition.length === 0) return 0.5;

    const scores = { 'Poor': 0, 'Good': 0.75, 'Excellent': 1 };
    const totalScore = withCondition.reduce((sum, r) => sum + (scores[r.condition_indicator || 'Poor'] || 0), 0);
    
    return totalScore / withCondition.length;
  }

  /**
   * Calculate efficiency metric
   */
  private calculateEfficiency(records: FishGrowth[]): number {
    if (records.length < 2) return 0;

    const sorted = records.sort((a, b) => 
      new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime()
    );

    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const lengthGrowth = (last.length_cm || 0) - (first.length_cm || 0);
    const weightGrowth = (last.weight_gram || 0) - (first.weight_gram || 0);

    // Efficiency based on length-to-weight ratio improvement
    const initialRatio = (first.length_cm || 1) / (first.weight_gram || 1);
    const finalRatio = (last.length_cm || 1) / (last.weight_gram || 1);

    return Math.max(0, Math.min(1, (finalRatio - initialRatio) / initialRatio + 0.5));
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(devices: Array<{ deviceId: string; rank: number; score: number; metrics: any; comparison: any }>): Array<{
    deviceId: string;
    priority: 'high' | 'medium' | 'low';
    recommendation: string;
    expectedImprovement: number;
  }> {
    const recommendations: Array<{
      deviceId: string;
      priority: 'high' | 'medium' | 'low';
      recommendation: string;
      expectedImprovement: number;
    }> = [];

    for (const device of devices) {
      if (device.rank > devices.length * 0.7) {
        recommendations.push({
          deviceId: device.deviceId,
          priority: 'high' as const,
          recommendation: 'Review feeding schedule and water quality parameters',
          expectedImprovement: 0.15,
        });
      } else if (device.rank > devices.length * 0.4) {
        recommendations.push({
          deviceId: device.deviceId,
          priority: 'medium' as const,
          recommendation: 'Optimize feeding frequency and monitor growth consistency',
          expectedImprovement: 0.10,
        });
      } else {
        recommendations.push({
          deviceId: device.deviceId,
          priority: 'low' as const,
          recommendation: 'Maintain current practices and monitor for continued excellence',
          expectedImprovement: 0.05,
        });
      }
    }

    return recommendations;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cacheService.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cacheService.getStats().itemCount,
      keys: [], // Keys are internal to cache service
    };
  }

  /**
   * Get cache hit rate
   */
  getCacheHitRate(): number {
    return this.cacheService.getHitRate();
  }

  /**
   * Get cache memory usage
   */
  getCacheMemoryUsage() {
    return this.cacheService.getMemoryUsage();
  }
}
