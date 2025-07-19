import { plainToClass } from 'class-transformer';
import { ThresholdResponseDto } from './threshold-response.dto';
import { ThresholdConfigResponseDto } from './threshold-config-response.dto';

describe('ThresholdResponseDto', () => {
  it('should create a valid response DTO with all fields', () => {
    const mockData = {
      id: 'threshold-uuid-123',
      device_id: 'SMNR-1234',
      threshold_data: {
        ph_min: '6.5',
        ph_max: '8.5',
        tds_min: '200',
        tds_max: '800',
        do_min: '5.0',
        do_max: '12.0',
        temp_min: '20.0',
        temp_max: '30.0',
      },
      updated_at: new Date('2024-01-15T10:30:00Z'),
      updated_by: 'user-uuid-123',
      ack_status: 'success',
      ack_received_at: new Date('2024-01-15T10:30:05Z'),
      mqtt_published: true,
    };

    const dto = new ThresholdResponseDto(mockData);

    expect(dto.id).toBe(mockData.id);
    expect(dto.device_id).toBe(mockData.device_id);
    expect(dto.threshold_data).toEqual(mockData.threshold_data);
    expect(dto.updated_at).toBe(mockData.updated_at);
    expect(dto.updated_by).toBe(mockData.updated_by);
    expect(dto.ack_status).toBe(mockData.ack_status);
    expect(dto.ack_received_at).toBe(mockData.ack_received_at);
    expect(dto.mqtt_published).toBe(mockData.mqtt_published);
  });

  it('should handle null values correctly', () => {
    const mockData = {
      id: 'threshold-uuid-123',
      device_id: 'SMNR-1234',
      threshold_data: { ph_min: '6.5' },
      updated_at: new Date('2024-01-15T10:30:00Z'),
      updated_by: null,
      ack_status: 'pending',
      ack_received_at: null,
      mqtt_published: false,
    };

    const dto = new ThresholdResponseDto(mockData);

    expect(dto.updated_by).toBeNull();
    expect(dto.ack_received_at).toBeNull();
    expect(dto.mqtt_published).toBe(false);
  });

  it('should work with plainToClass transformation', () => {
    const mockData = {
      id: 'threshold-uuid-123',
      device_id: 'SMNR-1234',
      threshold_data: { ph_min: '6.5' },
      updated_at: '2024-01-15T10:30:00Z',
      updated_by: 'user-uuid-123',
      ack_status: 'success',
      ack_received_at: '2024-01-15T10:30:05Z',
      mqtt_published: true,
    };

    const dto = plainToClass(ThresholdResponseDto, mockData);

    expect(dto.id).toBe(mockData.id);
    expect(dto.device_id).toBe(mockData.device_id);
    expect(dto.threshold_data).toEqual(mockData.threshold_data);
    expect(dto.ack_status).toBe(mockData.ack_status);
    expect(dto.mqtt_published).toBe(mockData.mqtt_published);
  });

  it('should exclude non-exposed fields when serialized', () => {
    const mockData = {
      id: 'threshold-uuid-123',
      device_id: 'SMNR-1234',
      threshold_data: { ph_min: '7.0' },
      updated_at: new Date('2024-01-15T10:30:00Z'),
      updated_by: 'user-uuid-123',
      ack_status: 'success',
      ack_received_at: new Date('2024-01-15T10:30:05Z'),
      mqtt_published: true,
      internal_field: 'should_not_appear', // This should be excluded
    };

    const dto = new ThresholdResponseDto(mockData);
    const serialized = JSON.parse(JSON.stringify(dto));

    expect(serialized.internal_field).toBeUndefined();
    expect(serialized.id).toBeDefined();
    expect(serialized.device_id).toBeDefined();
  });

  it('should handle partial threshold data', () => {
    const mockData = {
      id: 'threshold-uuid-123',
      device_id: 'SMNR-1234',
      threshold_data: {
        ph_min: '6.5',
        tds_max: '800', // Only partial data
      },
      updated_at: new Date('2024-01-15T10:30:00Z'),
      updated_by: 'user-uuid-123',
      ack_status: 'success',
      ack_received_at: new Date('2024-01-15T10:30:05Z'),
      mqtt_published: true,
    };

    const dto = new ThresholdResponseDto(mockData);

    expect(dto.threshold_data).toEqual({
      ph_min: '6.5',
      tds_max: '800',
    });
    expect(dto.threshold_data.ph_max).toBeUndefined();
    expect(dto.threshold_data.tds_min).toBeUndefined();
  });

  it('should handle different ack statuses correctly', () => {
    const statuses = ['pending', 'success', 'failed'] as const;

    statuses.forEach((status) => {
      const mockData = {
        id: `threshold-${status}`,
        device_id: 'SMNR-1234',
        threshold_data: { ph_min: '7.0' },
        updated_at: new Date('2024-01-15T10:30:00Z'),
        updated_by: 'user-uuid-123',
        ack_status: status,
        ack_received_at:
          status === 'success' ? new Date('2024-01-15T10:30:05Z') : null,
        mqtt_published: true,
      };

      const dto = new ThresholdResponseDto(mockData);

      expect(dto.ack_status).toBe(status);
      expect(dto.ack_received_at).toBe(mockData.ack_received_at);
    });
  });
});

describe('ThresholdConfigResponseDto', () => {
  it('should create a valid config response DTO', () => {
    const mockData = {
      device_id: 'SMNR-1234',
      thresholds: {
        ph_min: '6.5',
        ph_max: '8.5',
        tds_min: '200',
        tds_max: '800',
      },
      updated_at: new Date('2024-01-15T10:30:00Z'),
      ack_status: 'success',
    };

    const dto = new ThresholdConfigResponseDto(mockData);

    expect(dto.device_id).toBe(mockData.device_id);
    expect(dto.thresholds).toEqual(mockData.thresholds);
    expect(dto.updated_at).toBe(mockData.updated_at);
    expect(dto.ack_status).toBe(mockData.ack_status);
    expect(dto.is_active).toBe(true); // Should be true when ack_status is 'success'
  });

  it('should set is_active to false when ack_status is not success', () => {
    const mockData = {
      device_id: 'SMNR-1234',
      thresholds: { ph_min: '6.5' },
      updated_at: new Date('2024-01-15T10:30:00Z'),
      ack_status: 'pending',
    };

    const dto = new ThresholdConfigResponseDto(mockData);

    expect(dto.is_active).toBe(false);
  });

  it('should set is_active to false when ack_status is failed', () => {
    const mockData = {
      device_id: 'SMNR-1234',
      thresholds: { ph_min: '6.5' },
      updated_at: new Date('2024-01-15T10:30:00Z'),
      ack_status: 'failed',
    };

    const dto = new ThresholdConfigResponseDto(mockData);

    expect(dto.is_active).toBe(false);
  });

  it('should work with plainToClass transformation', () => {
    const mockData = {
      device_id: 'SMNR-1234',
      thresholds: { ph_min: '6.5' },
      updated_at: '2024-01-15T10:30:00Z',
      ack_status: 'success',
    };

    const dto = plainToClass(ThresholdConfigResponseDto, mockData);

    expect(dto.device_id).toBe(mockData.device_id);
    expect(dto.thresholds).toEqual(mockData.thresholds);
    expect(dto.ack_status).toBe(mockData.ack_status);
    expect(dto.is_active).toBe(true);
  });

  it('should handle empty thresholds object', () => {
    const mockData = {
      device_id: 'SMNR-5678',
      thresholds: {},
      updated_at: new Date('2024-01-15T10:30:00Z'),
      ack_status: 'pending',
    };

    const dto = new ThresholdConfigResponseDto(mockData);

    expect(dto.thresholds).toEqual({});
    expect(dto.is_active).toBe(false);
  });

  it('should handle missing thresholds field', () => {
    const mockData = {
      device_id: 'SMNR-1234',
      // thresholds missing
      updated_at: new Date('2024-01-15T10:30:00Z'),
      ack_status: 'pending',
    };

    const dto = new ThresholdConfigResponseDto(mockData);

    expect(dto.thresholds).toBeUndefined();
    expect(dto.is_active).toBe(false);
  });

  it('should handle complex threshold configurations', () => {
    const mockData = {
      device_id: 'SMNR-9999',
      thresholds: {
        ph_min: '6.0',
        ph_max: '8.0',
        tds_min: '100',
        tds_max: '1000',
        do_min: '4.0',
        do_max: '15.0',
        temp_min: '18.0',
        temp_max: '32.0',
      },
      updated_at: new Date('2024-01-15T10:30:00Z'),
      ack_status: 'success',
    };

    const dto = new ThresholdConfigResponseDto(mockData);

    expect(dto.thresholds).toEqual(mockData.thresholds);
    expect(dto.is_active).toBe(true);
    expect(Object.keys(dto.thresholds)).toHaveLength(8);
  });
});
