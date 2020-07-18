import { Component, OnInit } from '@angular/core';

import { AzureBlobService } from './azure-blob.service';
import { BlobItem } from '@azure/storage-blob';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  title = 'web1';
  currentFile: File = null;
  blobs: BlobItem[];

  constructor(private azureBlobService: AzureBlobService) {}

  async ngOnInit(): Promise<void> {
    this.blobs = await this.azureBlobService.getBlobs();

    for (const blob of this.blobs) {
      console.log(blob);
    }
  }

  onFileChange(event): void {
    this.currentFile = event.target.files[0];
    this.upload();
  }

  upload(): void {
    this.azureBlobService
      .uploadFile(this.currentFile)
      .finally(() => window.location.reload());
  }

  download(blob: BlobItem): void {
    console.log('download: ', blob);
    this.azureBlobService.downloadFile(blob);
  }

  delete(blob: BlobItem): void {
    console.log('delete', blob);
    this.azureBlobService
      .deleteFile(blob)
      .finally(() => window.location.reload());
  }
}
