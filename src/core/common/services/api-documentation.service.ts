import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * API Documentation Service
 * 
 * Provides comprehensive API documentation and usage guides
 * for the SIMONAIR aquaculture monitoring system.
 */
@Injectable()
export class ApiDocumentationService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Generate API documentation metadata
   */
  getApiMetadata() {
    return {
      title: 'SIMONAIR API',
      version: '4.0',
      description: this.getApiDescription(),
      contact: {
        name: 'SIMONAIR Support',
        url: 'https://github.com/naufalrf4/backend-simonair',
        email: 'support@simonair.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      },
      servers: this.getServerList(),
      tags: this.getApiTags()
    };
  }

  /**
   * Get comprehensive API description
   */
  private getApiDescription(): string {
    return `
      **SIMONAIR Aquaculture Monitoring API**
      
      A comprehensive REST API for aquaculture monitoring and management, providing real-time water quality monitoring, device management, and data analytics for fish and shrimp farming operations.
      
      ## 🌊 Core Features
      
      ### Device Management
      - Register and manage IoT monitoring devices
      - Device health monitoring and diagnostics
      - Firmware update management
      
      ### Real-time Monitoring
      - **pH Monitoring**: Track water acidity levels (0-14 scale)
      - **TDS Monitoring**: Total Dissolved Solids measurement (0-2000 ppm)
      - **DO Monitoring**: Dissolved Oxygen levels (0-20 mg/L)
      - **Temperature Monitoring**: Water temperature (-10°C to 50°C)
      
      ### MQTT Communication
      - Send calibration commands to devices
      - Configure water quality thresholds
      - Receive real-time sensor data
      - Device acknowledgment and status tracking
      
      ### Water Quality Management
      - Automated threshold monitoring
      - Real-time alert generation
      - Historical trend analysis
      - Emergency response protocols
      
      ### Aquaculture Operations
      - Fish growth tracking and analytics
      - Feed management and scheduling
      - Water quality event logging
      - Performance metrics and KPIs
      
      ### Data & Analytics
      - Historical data export (CSV, PDF, Excel)
      - Custom report generation
      - Trend analysis and forecasting
      - Performance benchmarking
      
      ## 🔐 Authentication & Security
      
      The API uses **JWT (JSON Web Tokens)** for authentication with role-based access control:
      
      - **Bearer Token**: Include in Authorization header: \`Authorization: Bearer <token>\`
      - **Refresh Tokens**: Stored in secure httpOnly cookies
      - **Rate Limiting**: 10 requests per minute per IP
      - **Role-based Access**: USER, ADMIN, SUPERUSER roles
      
      ## 📊 Response Format
      
      All API responses follow a consistent structure:
      
      **Success Response:**
      \`\`\`json
      {
        "status": "success",
        "data": { ... },
        "metadata": {
          "timestamp": "2024-01-15T10:30:00.123Z",
          "path": "/api/endpoint",
          "executionTime": 45,
          "requestId": "req-123e4567-e89b-12d3-a456-426614174000",
          "version": "4.0",
          "method": "POST"
        },
        "pagination": { ... } // if applicable
      }
      \`\`\`
      
      **Error Response:**
      \`\`\`json
      {
        "status": "error",
        "error": {
          "code": 400,
          "message": "Validation failed",
          "details": [...],
          "type": "VALIDATION_ERROR",
          "context": { ... }
        },
        "metadata": {
          "timestamp": "2024-01-15T10:30:00.123Z",
          "path": "/api/endpoint",
          "requestId": "req-error-123"
        }
      }
      \`\`\`
      
      ## 🚀 Quick Start Guide
      
      ### 1. Authentication
      \`\`\`bash
      # Login to get access token
      curl -X POST /auth/login \\
        -H "Content-Type: application/json" \\
        -d '{"email": "user@example.com", "password": "password"}'
      \`\`\`
      
      ### 2. Register Device
      \`\`\`bash
      # Register a new monitoring device
      curl -X POST /devices \\
        -H "Authorization: Bearer <token>" \\
        -H "Content-Type: application/json" \\
        -d '{"device_id": "SMNR-1234", "name": "Pond A Monitor", "location": "Pond A"}'
      \`\`\`
      
      ### 3. Send Calibration
      \`\`\`bash
      # Calibrate pH sensor
      curl -X POST /devices/SMNR-1234/calibrations \\
        -H "Authorization: Bearer <token>" \\
        -H "Content-Type: application/json" \\
        -d '{
          "sensor_type": "ph",
          "calibration_points": [
            {"standard_value": "4.00", "measured_value": "4.02", "temperature": "25.0"},
            {"standard_value": "7.00", "measured_value": "7.01", "temperature": "25.0"}
          ]
        }'
      \`\`\`
      
      ### 4. Set Thresholds
      \`\`\`bash
      # Configure water quality thresholds
      curl -X POST /devices/SMNR-1234/thresholds \\
        -H "Authorization: Bearer <token>" \\
        -H "Content-Type: application/json" \\
        -d '{
          "ph_min": "7.5", "ph_max": "8.5",
          "tds_min": "300", "tds_max": "500",
          "do_min": "5.0", "do_max": "12.0"
        }'
      \`\`\`
      
      ## 📱 MQTT Integration
      
      Device communication uses MQTT with the following topic structure:
      
      - **Calibrations**: \`simonair/{deviceId}/calibration\`
      - **Thresholds**: \`simonair/{deviceId}/threshold\`
      - **Sensor Data**: \`simonair/{deviceId}/sensor-data\`
      - **Device Status**: \`simonair/{deviceId}/status\`
      - **Acknowledgments**: \`simonair/{deviceId}/ack\`
      
      ## ⚡ Performance & Monitoring
      
      **Response Time Targets:**
      - Authentication: < 200ms
      - Device Operations: < 150ms
      - Data Retrieval: < 200ms
      - MQTT Operations: < 100ms
      
      **Monitoring Headers:**
      - \`X-Response-Time\`: Response generation time
      - \`X-Request-ID\`: Request tracking identifier
      - \`X-Cache-Status\`: Cache hit/miss status
      
      ## 🐛 Error Handling
      
      The API provides detailed error information with:
      - **Specific error codes** for different failure types
      - **Field-level validation** details
      - **Context information** for debugging
      - **Request tracing** with unique IDs
      
      ## 📈 Rate Limiting
      
      - **Global Limit**: 10 requests per minute per IP
      - **Authentication**: Special limits for login attempts
      - **Headers**: Rate limit status in response headers
      
      ## 🔧 SDKs & Libraries
      
      **Official SDKs** (coming soon):
      - JavaScript/TypeScript SDK
      - Python SDK
      - Mobile SDK (React Native)
      
      **Community Libraries**:
      - OpenAPI/Swagger generated clients
      - Postman collection available
      
      For detailed endpoint documentation, examples, and testing, explore the interactive API documentation below.
    `;
  }

  /**
   * Get server list based on environment
   */
  private getServerList() {
    const servers = [
      {
        url: 'http://localhost:3000',
        description: 'Development Server'
      }
    ];

    if (this.configService.get('NODE_ENV') === 'production') {
      servers.push({
        url: 'https://api.simonair.com',
        description: 'Production Server'
      });
    }

    return servers;
  }

  /**
   * Get API tags with descriptions
   */
  private getApiTags() {
    return [
      {
        name: 'Authentication',
        description: `
          **User Authentication & Authorization**
          
          Secure authentication system with JWT tokens and role-based access control.
          Supports standard login/register, OAuth (Google), password reset, and refresh tokens.
          
          **Features:**
          - JWT access tokens (15 min expiry)
          - Refresh tokens (7 days, httpOnly cookies)
          - Rate limiting for security
          - Multi-factor authentication ready
          - Role-based permissions (USER, ADMIN, SUPERUSER)
        `
      },
      {
        name: 'Devices',
        description: `
          **Device Registration & Management**
          
          Comprehensive device management for aquaculture monitoring equipment.
          Handle device registration, configuration, health monitoring, and lifecycle management.
          
          **Features:**
          - Device registration with unique SMNR-XXXX IDs
          - Health monitoring and diagnostics
          - Firmware update management
          - Location and metadata tracking
          - Device ownership and access control
        `
      },
      {
        name: 'Device Calibrations',
        description: `
          **Sensor Calibration via MQTT**
          
          Send calibration commands to devices for accurate sensor readings.
          Supports multi-point calibration for pH, TDS, and DO sensors.
          
          **Supported Sensors:**
          - **pH**: 2-3 point calibration (buffer solutions)
          - **TDS**: 1-2 point calibration (conductivity standards)
          - **DO**: 2 point calibration (zero and air-saturated)
          
          **Process:**
          1. Validate calibration data
          2. Send via MQTT to device
          3. Store calibration record
          4. Track acknowledgment status
        `
      },
      {
        name: 'Device Thresholds',
        description: `
          **Water Quality Threshold Configuration**
          
          Configure water quality alert thresholds for automated monitoring.
          Set minimum and maximum values for pH, TDS, DO, and temperature.
          
          **Threshold Types:**
          - **pH**: 0-14 scale (typical: 6.5-8.5)
          - **TDS**: 0-2000 ppm (typical: 200-800)
          - **DO**: 0-20 mg/L (typical: 5-12)
          - **Temperature**: -10°C to 50°C (typical: 20-30°C)
          
          **Features:**
          - Real-time threshold monitoring
          - Automated alert generation
          - Partial threshold updates
          - Species-specific presets
        `
      },
      {
        name: 'Sensors',
        description: `
          **Sensor Data Collection & Monitoring**
          
          Real-time sensor data collection, storage, and analysis.
          Handle incoming sensor readings from MQTT and provide historical data access.
          
          **Data Types:**
          - Real-time sensor readings
          - Historical data with timestamps
          - Data quality indicators
          - Aggregated statistics
          - Trend analysis
        `
      },
      {
        name: 'Users',
        description: `
          **User Management & Profiles**
          
          User account management with role-based access control.
          Handle user creation, profile updates, password management, and permissions.
          
          **User Roles:**
          - **USER**: Basic device access and operations
          - **ADMIN**: User management and advanced features
          - **SUPERUSER**: Full system administration
          
          **Features:**
          - Profile management
          - Password security
          - Role assignments
          - Activity tracking
        `
      },
      {
        name: 'Fish Growth',
        description: `
          **Fish Development Tracking**
          
          Monitor and track fish growth metrics for aquaculture optimization.
          Record measurements, analyze growth trends, and generate reports.
          
          **Metrics:**
          - Length measurements (cm)
          - Weight tracking (grams)
          - Growth rate calculations
          - Population analytics
          - Feed conversion ratios
        `
      },
      {
        name: 'Feed Management',
        description: `
          **Feeding Schedule & Analytics**
          
          Manage feeding schedules, track feed consumption, and analyze feeding efficiency.
          Support multiple feed types and automated scheduling.
          
          **Features:**
          - Feed type registration
          - Automated scheduling
          - Consumption tracking
          - Efficiency analytics
          - Cost optimization
        `
      },
      {
        name: 'MQTT Health',
        description: `
          **MQTT Broker Monitoring**
          
          Monitor MQTT broker connection health and communication status.
          Provides diagnostics for device communication reliability.
          
          **Health Metrics:**
          - Connection status
          - Message delivery rates
          - Latency measurements
          - Error tracking
          - Reconnection attempts
        `
      },
      {
        name: 'Events',
        description: `
          **Water Quality Events & Alerts**
          
          Track water quality events, threshold violations, and system alerts.
          Provide event history and real-time notification system.
          
          **Event Types:**
          - Threshold violations
          - Sensor malfunctions
          - Communication failures
          - System maintenance
          - Emergency alerts
        `
      },
      {
        name: 'Export',
        description: `
          **Data Export & Reporting**
          
          Export historical data and generate comprehensive reports.
          Support multiple formats and customizable date ranges.
          
          **Export Formats:**
          - CSV for data analysis
          - PDF for official reports
          - Excel for spreadsheet analysis
          - JSON for API integration
          
          **Report Types:**
          - Water quality summaries
          - Device performance reports
          - Growth analytics
          - Feed efficiency reports
        `
      }
    ];
  }

  /**
   * Generate usage examples for common operations
   */
  getUsageExamples() {
    return {
      authentication: this.getAuthExamples(),
      calibration: this.getCalibrationExamples(),
      thresholds: this.getThresholdExamples(),
      monitoring: this.getMonitoringExamples(),
      analytics: this.getAnalyticsExamples()
    };
  }

  private getAuthExamples() {
    return {
      login: {
        description: 'Authenticate user and receive access token',
        curl: `curl -X POST http://localhost:3000/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com",
    "password": "StrongPassword123!"
  }'`,
        response: {
          status: 'success',
          data: {
            accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            user: {
              id: '550e8400-e29b-41d4-a716-446655440000',
              email: 'user@example.com',
              fullName: 'John Doe',
              role: 'user'
            }
          }
        }
      }
    };
  }

  private getCalibrationExamples() {
    return {
      phCalibration: {
        description: 'Calibrate pH sensor with 3-point calibration',
        curl: `curl -X POST http://localhost:3000/devices/SMNR-1234/calibrations \\
  -H "Authorization: Bearer <your-token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sensor_type": "ph",
    "calibration_points": [
      {"standard_value": "4.00", "measured_value": "4.02", "temperature": "25.0"},
      {"standard_value": "7.00", "measured_value": "7.01", "temperature": "25.0"},
      {"standard_value": "10.00", "measured_value": "9.98", "temperature": "25.0"}
    ],
    "notes": "Monthly calibration with fresh buffer solutions"
  }'`
      }
    };
  }

  private getThresholdExamples() {
    return {
      shrimpFarming: {
        description: 'Set optimal thresholds for shrimp farming',
        curl: `curl -X POST http://localhost:3000/devices/SMNR-1234/thresholds \\
  -H "Authorization: Bearer <your-token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "ph_min": "7.5", "ph_max": "8.5",
    "tds_min": "300", "tds_max": "500",
    "do_min": "5.0", "do_max": "12.0",
    "temp_min": "26.0", "temp_max": "30.0"
  }'`
      }
    };
  }

  private getMonitoringExamples() {
    return {
      sensorData: {
        description: 'Retrieve recent sensor data for analysis',
        curl: `curl -X GET "http://localhost:3000/sensors/SMNR-1234?startDate=2024-01-01&endDate=2024-01-31&limit=100" \\
  -H "Authorization: Bearer <your-token>"`
      }
    };
  }

  private getAnalyticsExamples() {
    return {
      fishGrowth: {
        description: 'Get fish growth analytics for performance tracking',
        curl: `curl -X GET http://localhost:3000/fish/analytics/SMNR-1234 \\
  -H "Authorization: Bearer <your-token>"`
      }
    };
  }
}
