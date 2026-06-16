const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'chat-service',
  brokers: [process.env.KAFKA_SERVER || 'kafka:29092'],
  retry: {
    initialRetryTime: 3000,
    retries: 5,
  },
});

const producer = kafka.producer();

let isConnected = false;

const connectProducer = async () => {
  if (!isConnected) {
    await producer.connect();
    isConnected = true;
    console.log('Kafka producer connected');
  }
};

const disconnectProducer = async () => {
  if (isConnected) {
    await producer.disconnect();
    isConnected = false;
  }
};

module.exports = { kafka, producer, connectProducer, disconnectProducer };
