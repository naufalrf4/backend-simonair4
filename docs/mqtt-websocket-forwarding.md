# MQTT to WebSocket Data Forwarding

## Overview

The enhanced MQTT to WebSocket forwarding system provides real-time sensor data broadcasting to connected clients. The system now supports dual-layer data forwarding:

1. **Real-time MQTT Data** - Immediate forwarding of raw validated sensor data
2. **Processed Database Data** - Calibrated and processed sensor data with status calculations

## Data Flow Architecture

```
MQTT Device → MqttService → [Real-time WebSocket] → SensorsService → Database → [Processed WebSocket]
```

### 1. Real-time Data Flow (MQTT → WebSocket)

When sensor data is received from MQTT:

```typescript
// In MqttService.handleSensorDataMessage()
this.eventsGateway.broadcastRealtime(deviceId, validatedData);
```

**Event**: `realtimeSensorUpdate`
**Data Structure**:
```json
{
  "temperature": { "raw": 25.5, "unit": "°C" },
  "ph": { "raw": 7.2, "unit": "pH" },
  "tds": { "raw": 150, "unit": "ppm" },
  "do_level": { "raw": 6.8, "unit": "mg/L" },
  "realtime": true,
  "source": "mqtt",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. Processed Data Flow (Database → WebSocket)

After data processing and database storage:

```typescript
// In SensorsService.processAndSaveData()
this.eventsGateway.broadcast(deviceId, {
  ...savedData,
  processed: true,
  source: 'database'
});
```

**Event**: `sensorUpdate`
**Data Structure**:
```json
{
  "id": "uuid",
  "device_id": "device123",
  "temperature": {
    "raw": 25.5,
    "calibrated": 25.7,
    "calibrated_ok": true,
    "status": "normal",
    "unit": "°C"
  },
  "ph": {
    "raw": 7.2,
    "calibrated": 7.15,
    "calibrated_ok": true,
    "status": "normal",
    "unit": "pH"
  },
  "processed": true,
  "source": "database",
  "time": "2024-01-15T10:30:00.000Z"
}
```

## WebSocket Events

### Client Connection Events

#### 1. Join Device Room
```typescript
// Client sends
socket.emit('join_device_room', { deviceId: 'device123' });

// Server responds
socket.emit('roomJoined', {
  room: 'device:device123',
  deviceId: 'device123',
  timestamp: '2024-01-15T10:30:00.000Z'
});
```

#### 2. Real-time Sensor Updates
```typescript
// Server broadcasts to room: device:deviceId
socket.on('realtimeSensorUpdate', (data) => {
  console.log('Real-time sensor data:', data);
  // Update UI immediately with raw data
});
```

#### 3. Processed Sensor Updates
```typescript
// Server broadcasts to room: device:deviceId
socket.on('sensorUpdate', (data) => {
  console.log('Processed sensor data:', data);
  // Update UI with calibrated data and status
});
```

#### 4. Device Status Updates
```typescript
// Server broadcasts device status changes
socket.on('deviceStatus', (data) => {
  console.log('Device status:', data);
  // Update device connection status
});
```

## Client Implementation Example

### JavaScript/TypeScript Client

```typescript
import { io } from 'socket.io-client';

class SensorDataClient {
  private socket;

  constructor(token: string) {
    this.socket = io('ws://localhost:3000', {
      auth: { token }
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    // Real-time sensor data (immediate, raw)
    this.socket.on('realtimeSensorUpdate', (data) => {
      this.handleRealtimeData(data);
    });

    // Processed sensor data (calibrated, with status)
    this.socket.on('sensorUpdate', (data) => {
      this.handleProcessedData(data);
    });

    // Device status updates
    this.socket.on('deviceStatus', (data) => {
      this.handleDeviceStatus(data);
    });

    // Room join confirmation
    this.socket.on('roomJoined', (data) => {
      console.log(`Joined room for device: ${data.deviceId}`);
    });
  }

  public subscribeToDevice(deviceId: string) {
    this.socket.emit('join_device_room', { deviceId });
  }

  private handleRealtimeData(data: any) {
    // Update UI with real-time data (e.g., live charts)
    console.log('Real-time update:', data);
  }

  private handleProcessedData(data: any) {
    // Update UI with processed data (e.g., status indicators)
    console.log('Processed update:', data);
  }

  private handleDeviceStatus(data: any) {
    // Update device connection status
    console.log('Device status:', data);
  }
}

// Usage
const client = new SensorDataClient('your-jwt-token');
client.subscribeToDevice('device123');
```

### React Hook Example

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SensorData {
  temperature?: any;
  ph?: any;
  tds?: any;
  do_level?: any;
  timestamp?: string;
  realtime?: boolean;
  processed?: boolean;
}

export const useSensorWebSocket = (token: string, deviceId: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [realtimeData, setRealtimeData] = useState<SensorData | null>(null);
  const [processedData, setProcessedData] = useState<SensorData | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const newSocket = io('ws://localhost:3000', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('join_device_room', { deviceId });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('realtimeSensorUpdate', (data: SensorData) => {
      setRealtimeData(data);
    });

    newSocket.on('sensorUpdate', (data: SensorData) => {
      setProcessedData(data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token, deviceId]);

  return {
    socket,
    realtimeData,
    processedData,
    isConnected
  };
};
```

## Authentication

All WebSocket connections require JWT authentication:

```typescript
const socket = io('ws://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

## Room Management

- Clients automatically join device-specific rooms: `device:{deviceId}`
- Only authorized users can join device rooms (validated via JWT)
- Room membership is checked against device ownership

## Error Handling

### Connection Errors
- Invalid or missing JWT token results in disconnection
- Unauthorized device access is logged and rejected

### Data Validation
- Invalid sensor data is logged but not forwarded to WebSocket
- Malformed MQTT messages are caught and logged

## Performance Considerations

### Throttling
- MQTT messages are throttled to prevent spam (10-second intervals)
- WebSocket broadcasts are optimized for minimal latency

### Room Broadcasting
- Data is only sent to clients subscribed to specific device rooms
- Reduces unnecessary network traffic

### Logging
- All WebSocket events are logged with detailed metadata
- Performance metrics are tracked for monitoring

## Monitoring and Debugging

### Server Logs
```typescript
// Real-time broadcast logs
"Broadcasted real-time sensor update to room device:123"

// Processed data broadcast logs  
"Broadcasted sensor update to room device:123"

// Connection logs
"Client abc123 joined device room: device:123"
```

### Client Debugging
```typescript
// Enable debug mode
localStorage.debug = 'socket.io-client:socket';

// Monitor events
socket.onAny((event, ...args) => {
  console.log('WebSocket event:', event, args);
});
```

This enhanced system provides both immediate real-time data for responsive UIs and processed data for accurate status monitoring and historical tracking.
