const mongoose = require('mongoose');
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const cron = require('node-cron');
const crypto = require('crypto');
const zlib = require('zlib');
const { promisify } = require('util');

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'ap-south-1'
});

const execAsync = promisify(exec);

class BackupService {
  constructor() {
    this.backupBucket = process.env.BACKUP_S3_BUCKET || 'gstpassociation-backups';
    this.encryptionKey = process.env.BACKUP_ENCRYPTION_KEY || crypto.randomBytes(32);
    this.backupPath = process.env.BACKUP_LOCAL_PATH || './backups';
    this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS) || 90;
    
    // Ensure backup directory exists
    if (!fs.existsSync(this.backupPath)) {
      fs.mkdirSync(this.backupPath, { recursive: true });
    }
    
    this.initializeScheduledBackups();
  }

  // Initialize scheduled backup jobs
  initializeScheduledBackups() {
    // Daily database backup at 2 AM IST
    cron.schedule('0 2 * * *', async () => {
      console.log('Starting scheduled database backup...');
      await this.performDatabaseBackup('daily');
    }, {
      timezone: 'Asia/Kolkata'
    });

    // Weekly full backup on Sundays at 1 AM IST
    cron.schedule('0 1 * * 0', async () => {
      console.log('Starting scheduled full backup...');
      await this.performFullBackup('weekly');
    }, {
      timezone: 'Asia/Kolkata'
    });

    // Monthly archive backup on 1st of every month at 12 AM IST
    cron.schedule('0 0 1 * *', async () => {
      console.log('Starting scheduled monthly backup...');
      await this.performFullBackup('monthly');
    }, {
      timezone: 'Asia/Kolkata'
    });

    // Cleanup old backups daily at 3 AM IST
    cron.schedule('0 3 * * *', async () => {
      console.log('Starting backup cleanup...');
      await this.cleanupOldBackups();
    }, {
      timezone: 'Asia/Kolkata'
    });
  }

  // Perform database backup
  async performDatabaseBackup(type = 'manual') {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `db-backup-${type}-${timestamp}`;
      const localBackupPath = path.join(this.backupPath, `${backupName}.gz`);

      console.log(`Starting database backup: ${backupName}`);

      // Create MongoDB dump
      const mongoUri = process.env.MONGODB_URI;
      const dbName = mongoUri.split('/').pop().split('?')[0];
      
      const dumpCommand = `mongodump --uri="${mongoUri}" --out="${this.backupPath}/${backupName}"`;
      await execAsync(dumpCommand);

      // Compress the backup
      await this.compressDirectory(path.join(this.backupPath, backupName), localBackupPath);

      // Encrypt the backup
      const encryptedPath = await this.encryptFile(localBackupPath);

      // Upload to S3
      const s3Key = `database/${type}/${backupName}.gz.enc`;
      await this.uploadToS3(encryptedPath, s3Key);

      // Create backup metadata
      const metadata = {
        name: backupName,
        type: 'database',
        schedule: type,
        timestamp: new Date(),
        size: fs.statSync(encryptedPath).size,
        s3Key,
        checksum: await this.calculateChecksum(encryptedPath),
        collections: await this.getCollectionStats()
      };

      await this.saveBackupMetadata(metadata);

      // Cleanup local files
      await this.cleanupLocalFiles([
        path.join(this.backupPath, backupName),
        localBackupPath,
        encryptedPath
      ]);

      console.log(`Database backup completed: ${backupName}`);
      return metadata;

    } catch (error) {
      console.error('Database backup failed:', error);
      throw error;
    }
  }

  // Perform full system backup
  async performFullBackup(type = 'manual') {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `full-backup-${type}-${timestamp}`;

      console.log(`Starting full backup: ${backupName}`);

      // Backup database
      const dbBackup = await this.performDatabaseBackup(type);

      // Backup uploaded files
      const filesBackup = await this.backupUploadedFiles(backupName, type);

      // Backup configuration
      const configBackup = await this.backupConfiguration(backupName, type);

      // Create full backup metadata
      const metadata = {
        name: backupName,
        type: 'full',
        schedule: type,
        timestamp: new Date(),
        components: {
          database: dbBackup,
          files: filesBackup,
          configuration: configBackup
        },
        totalSize: dbBackup.size + filesBackup.size + configBackup.size
      };

      await this.saveBackupMetadata(metadata);

      console.log(`Full backup completed: ${backupName}`);
      return metadata;

    } catch (error) {
      console.error('Full backup failed:', error);
      throw error;
    }
  }

  // Backup uploaded files
  async backupUploadedFiles(backupName, type) {
    try {
      const uploadsPath = process.env.UPLOADS_PATH || './uploads';
      const backupPath = path.join(this.backupPath, `${backupName}-files.tar.gz`);

      if (!fs.existsSync(uploadsPath)) {
        console.log('No uploads directory found, skipping file backup');
        return { size: 0, s3Key: null };
      }

      // Create tar.gz archive of uploads
      const tarCommand = `tar -czf "${backupPath}" -C "${path.dirname(uploadsPath)}" "${path.basename(uploadsPath)}"`;
      await execAsync(tarCommand);

      // Encrypt the backup
      const encryptedPath = await this.encryptFile(backupPath);

      // Upload to S3
      const s3Key = `files/${type}/${backupName}-files.tar.gz.enc`;
      await this.uploadToS3(encryptedPath, s3Key);

      const size = fs.statSync(encryptedPath).size;

      // Cleanup local files
      await this.cleanupLocalFiles([backupPath, encryptedPath]);

      return {
        size,
        s3Key,
        checksum: await this.calculateChecksum(encryptedPath)
      };

    } catch (error) {
      console.error('File backup failed:', error);
      throw error;
    }
  }

  // Backup configuration
  async backupConfiguration(backupName, type) {
    try {
      const configData = {
        environment: process.env.NODE_ENV,
        timestamp: new Date(),
        version: process.env.npm_package_version,
        settings: {
          // Add important configuration settings (without secrets)
          features: {
            twoFactorAuth: process.env.ENABLE_2FA === 'true',
            emailVerification: process.env.ENABLE_EMAIL_VERIFICATION === 'true',
            smsNotifications: process.env.ENABLE_SMS === 'true'
          },
          limits: {
            maxFileSize: process.env.MAX_FILE_SIZE,
            rateLimit: process.env.RATE_LIMIT_REQUESTS
          }
        }
      };

      const configPath = path.join(this.backupPath, `${backupName}-config.json`);
      fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));

      // Encrypt the config
      const encryptedPath = await this.encryptFile(configPath);

      // Upload to S3
      const s3Key = `configuration/${type}/${backupName}-config.json.enc`;
      await this.uploadToS3(encryptedPath, s3Key);

      const size = fs.statSync(encryptedPath).size;

      // Cleanup local files
      await this.cleanupLocalFiles([configPath, encryptedPath]);

      return {
        size,
        s3Key,
        checksum: await this.calculateChecksum(encryptedPath)
      };

    } catch (error) {
      console.error('Configuration backup failed:', error);
      throw error;
    }
  }

  // Restore from backup
  async restoreFromBackup(backupId, options = {}) {
    try {
      const { restoreDatabase = true, restoreFiles = true, restoreConfig = false } = options;
      
      console.log(`Starting restore from backup: ${backupId}`);

      // Get backup metadata
      const metadata = await this.getBackupMetadata(backupId);
      if (!metadata) {
        throw new Error('Backup not found');
      }

      const results = {};

      if (restoreDatabase && metadata.components?.database) {
        results.database = await this.restoreDatabase(metadata.components.database);
      }

      if (restoreFiles && metadata.components?.files) {
        results.files = await this.restoreFiles(metadata.components.files);
      }

      if (restoreConfig && metadata.components?.configuration) {
        results.configuration = await this.restoreConfiguration(metadata.components.configuration);
      }

      console.log(`Restore completed for backup: ${backupId}`);
      return results;

    } catch (error) {
      console.error('Restore failed:', error);
      throw error;
    }
  }

  // Restore database
  async restoreDatabase(dbBackupMetadata) {
    try {
      // Download from S3
      const localPath = path.join(this.backupPath, 'restore-db.gz.enc');
      await this.downloadFromS3(dbBackupMetadata.s3Key, localPath);

      // Decrypt
      const decryptedPath = await this.decryptFile(localPath);

      // Decompress
      const extractPath = path.join(this.backupPath, 'restore-db');
      await this.decompressFile(decryptedPath, extractPath);

      // Restore to MongoDB
      const mongoUri = process.env.MONGODB_URI;
      const restoreCommand = `mongorestore --uri="${mongoUri}" --drop "${extractPath}"`;
      await execAsync(restoreCommand);

      // Cleanup
      await this.cleanupLocalFiles([localPath, decryptedPath, extractPath]);

      return { success: true, message: 'Database restored successfully' };

    } catch (error) {
      console.error('Database restore failed:', error);
      throw error;
    }
  }

  // Utility methods
  async compressDirectory(sourcePath, targetPath) {
    const tarCommand = `tar -czf "${targetPath}" -C "${path.dirname(sourcePath)}" "${path.basename(sourcePath)}"`;
    await execAsync(tarCommand);
  }

  async encryptFile(filePath) {
    const encryptedPath = `${filePath}.enc`;
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    
    const input = fs.createReadStream(filePath);
    const output = fs.createWriteStream(encryptedPath);
    
    return new Promise((resolve, reject) => {
      input.pipe(cipher).pipe(output);
      output.on('finish', () => resolve(encryptedPath));
      output.on('error', reject);
    });
  }

  async decryptFile(filePath) {
    const decryptedPath = filePath.replace('.enc', '');
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    
    const input = fs.createReadStream(filePath);
    const output = fs.createWriteStream(decryptedPath);
    
    return new Promise((resolve, reject) => {
      input.pipe(decipher).pipe(output);
      output.on('finish', () => resolve(decryptedPath));
      output.on('error', reject);
    });
  }

  async uploadToS3(filePath, s3Key) {
    const fileStream = fs.createReadStream(filePath);
    
    const uploadParams = {
      Bucket: this.backupBucket,
      Key: s3Key,
      Body: fileStream,
      ServerSideEncryption: 'AES256',
      StorageClass: 'STANDARD_IA' // Infrequent Access for cost optimization
    };

    return s3.upload(uploadParams).promise();
  }

  async downloadFromS3(s3Key, localPath) {
    const downloadParams = {
      Bucket: this.backupBucket,
      Key: s3Key
    };

    const fileStream = fs.createWriteStream(localPath);
    const s3Stream = s3.getObject(downloadParams).createReadStream();
    
    return new Promise((resolve, reject) => {
      s3Stream.pipe(fileStream);
      fileStream.on('finish', resolve);
      fileStream.on('error', reject);
    });
  }

  async calculateChecksum(filePath) {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    return new Promise((resolve, reject) => {
      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  async getCollectionStats() {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    const stats = {};
    for (const collection of collections) {
      const collStats = await db.collection(collection.name).stats();
      stats[collection.name] = {
        count: collStats.count,
        size: collStats.size,
        avgObjSize: collStats.avgObjSize
      };
    }
    
    return stats;
  }

  async saveBackupMetadata(metadata) {
    // Save to a backup metadata collection
    const BackupMetadata = mongoose.model('BackupMetadata', new mongoose.Schema({}, { strict: false }));
    return BackupMetadata.create(metadata);
  }

  async getBackupMetadata(backupId) {
    const BackupMetadata = mongoose.model('BackupMetadata', new mongoose.Schema({}, { strict: false }));
    return BackupMetadata.findById(backupId);
  }

  async cleanupLocalFiles(filePaths) {
    for (const filePath of filePaths) {
      try {
        if (fs.existsSync(filePath)) {
          if (fs.lstatSync(filePath).isDirectory()) {
            fs.rmSync(filePath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(filePath);
          }
        }
      } catch (error) {
        console.error(`Failed to cleanup file ${filePath}:`, error);
      }
    }
  }

  async cleanupOldBackups() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      // List old backups in S3
      const listParams = {
        Bucket: this.backupBucket,
        Prefix: ''
      };

      const objects = await s3.listObjectsV2(listParams).promise();
      const oldObjects = objects.Contents.filter(obj => obj.LastModified < cutoffDate);

      // Delete old backups
      if (oldObjects.length > 0) {
        const deleteParams = {
          Bucket: this.backupBucket,
          Delete: {
            Objects: oldObjects.map(obj => ({ Key: obj.Key }))
          }
        };

        await s3.deleteObjects(deleteParams).promise();
        console.log(`Cleaned up ${oldObjects.length} old backup files`);
      }

      // Cleanup old metadata
      const BackupMetadata = mongoose.model('BackupMetadata', new mongoose.Schema({}, { strict: false }));
      const deletedMetadata = await BackupMetadata.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      console.log(`Cleaned up ${deletedMetadata.deletedCount} old backup metadata records`);

    } catch (error) {
      console.error('Backup cleanup failed:', error);
    }
  }

  // Get backup status and statistics
  async getBackupStatus() {
    try {
      const BackupMetadata = mongoose.model('BackupMetadata', new mongoose.Schema({}, { strict: false }));
      
      const [recentBackups, totalBackups, totalSize] = await Promise.all([
        BackupMetadata.find().sort({ timestamp: -1 }).limit(10),
        BackupMetadata.countDocuments(),
        BackupMetadata.aggregate([
          { $group: { _id: null, totalSize: { $sum: '$size' } } }
        ])
      ]);

      return {
        recentBackups,
        totalBackups,
        totalSize: totalSize[0]?.totalSize || 0,
        retentionDays: this.retentionDays,
        nextScheduledBackup: this.getNextScheduledBackup()
      };

    } catch (error) {
      console.error('Failed to get backup status:', error);
      throw error;
    }
  }

  getNextScheduledBackup() {
    // Calculate next scheduled backup time
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0); // 2 AM next day
    
    return tomorrow;
  }
}

// Export singleton instance
const backupService = new BackupService();

module.exports = {
  backupService,
  BackupService
};
