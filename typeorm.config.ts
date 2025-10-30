import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

const getEnvVariable = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export default new DataSource({
  type: 'postgres',
  host: getEnvVariable('DB_HOST'),
  port: parseInt(getEnvVariable('DB_PORT'), 10),
  username: getEnvVariable('DB_USER'),
  password: getEnvVariable('DB_PASS'),
  database: getEnvVariable('DB_NAME'),
  entities: [
    'src/modules/**/entities/*.entity.ts',
    'src/shared/entities/*.entity.ts',
  ],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
