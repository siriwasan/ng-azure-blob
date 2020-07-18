import { Injectable } from '@angular/core';

import {
  BlobServiceClient,
  AnonymousCredential,
  newPipeline,
  ContainerClient,
  BlobItem,
  ContainerItem,
  BlobDeleteIfExistsResponse,
  BlobUploadCommonResponse,
} from '@azure/storage-blob';
import { environment } from './../environments/environment';
import * as CryptoJS from 'crypto-js';

@Injectable({
  providedIn: 'root',
})
export class AzureBlobService {
  private blobServiceClient: BlobServiceClient;
  private containerClient: ContainerClient;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // generate account sas token
    const accountName = environment.accountName;
    const key = environment.key;
    const start = new Date(new Date().getTime() - 15 * 60 * 1000);
    const end = new Date(new Date().getTime() + 30 * 60 * 1000);
    const signedpermissions = 'rwdlac';
    const signedservice = 'b';
    const signedresourcetype = 'sco';
    const signedexpiry =
      end.toISOString().substring(0, end.toISOString().lastIndexOf('.')) + 'Z';
    const signedProtocol = 'https';
    const signedversion = '2018-03-28';

    const StringToSign =
      accountName +
      '\n' +
      signedpermissions +
      '\n' +
      signedservice +
      '\n' +
      signedresourcetype +
      '\n' +
      '\n' +
      signedexpiry +
      '\n' +
      '\n' +
      signedProtocol +
      '\n' +
      signedversion +
      '\n';

    // const crypto = require('crypto');
    // const sig = crypto
    //   .createHmac('sha256', Buffer.from(key, 'base64'))
    //   .update(StringToSign, 'utf8')
    //   .digest('base64');
    const str = CryptoJS.HmacSHA256(
      StringToSign,
      CryptoJS.enc.Base64.parse(key)
    );
    const sig = CryptoJS.enc.Base64.stringify(str);

    const sasToken = `sv=${signedversion}&ss=${signedservice}&srt=${signedresourcetype}&sp=${signedpermissions}&se=${encodeURIComponent(
      signedexpiry
    )}&spr=${signedProtocol}&sig=${encodeURIComponent(sig)}`;
    const containerName = environment.containerName;

    const pipeline = newPipeline(new AnonymousCredential(), {
      retryOptions: { maxTries: 4 }, // Retry options
      userAgentOptions: { userAgentPrefix: 'AdvancedSample V1.0.0' }, // Customized telemetry string
      keepAliveOptions: {
        // Keep alive is enabled by default, disable keep alive by setting false
        enable: false,
      },
    });

    this.blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net?${sasToken}`,
      pipeline
    );
    this.containerClient = this.blobServiceClient.getContainerClient(
      containerName
    );
    if (!this.containerClient.exists()) {
      console.log('the container does not exit');
      await this.containerClient.create();
    }
  }

  async getContainers(): Promise<ContainerItem[]> {
    const containerList: ContainerItem[] = [];
    const containers = this.blobServiceClient.listContainers();
    for await (const container of containers) {
      containerList.push(container);
    }
    return containerList;
  }

  async getBlobs(): Promise<BlobItem[]> {
    const blobList: BlobItem[] = [];
    const blobs = this.containerClient.listBlobsFlat();
    for await (const blob of blobs) {
      blobList.push(blob);
    }
    return blobList;
  }

  uploadFile(file: File): Promise<BlobUploadCommonResponse> {
    const client = this.containerClient.getBlockBlobClient(file.name);
    return client.uploadBrowserData(file, {
      blockSize: 4 * 1024 * 1024, // 4MB block size
      concurrency: 20, // 20 concurrency
      onProgress: (ev) => console.log(ev),
      blobHTTPHeaders: { blobContentType: file.type },
    });
  }

  async downloadFile(blobItem: BlobItem): Promise<void> {
    const blobClient = this.containerClient.getBlobClient(blobItem.name);

    // Get blob content from position 0 to the end
    // In browsers, get downloaded data by accessing downloadBlockBlobResponse.blobBody
    const downloadBlockBlobResponse = await blobClient.download();
    const downloaded = await blobToString(
      await downloadBlockBlobResponse.blobBody
    );
    console.log('Downloaded blob content', downloaded);

    // [Browsers only] A helper method used to convert a browser Blob into string.
    // tslint:disable-next-line: typedef
    async function blobToString(blob: any) {
      const fileReader = new FileReader();
      return new Promise((resolve, reject) => {
        fileReader.onloadend = (ev) => {
          resolve(ev.target.result);
        };
        fileReader.onerror = reject;
        fileReader.readAsText(blob);
      });
    }
  }

  deleteFile(blobItem: BlobItem): Promise<BlobDeleteIfExistsResponse> {
    const blobClient = this.containerClient.getBlobClient(blobItem.name);
    return blobClient.deleteIfExists();
  }
}
