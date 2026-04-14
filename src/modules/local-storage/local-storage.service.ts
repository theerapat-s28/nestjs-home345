import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class LocalStorageService {
  private readonly uploadsDest: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadsDest = this.configService.get<string>("LOCAL_UPLOADS_DEST") || "uploads";
    
    // Ensure the upload directory exists
    const uploadPath = path.resolve(this.uploadsDest);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
  }

  /**
   * Generates a public URL for an uploaded file.
   * @param filename The name of the file
   * @param folder Optional subfolder name
   * @returns The full URL to access the file
   */
  getFileUrl(filename: string, folder?: string): string {
    const backendUrl = this.configService.get<string>("BACKEND_URL") || "http://localhost:3000";
    const folderPath = folder ? `${folder}/` : "";
    return `${backendUrl}/${this.uploadsDest}/${folderPath}${filename}`;
  }

  /**
   * Deletes a file from the local storage.
   * @param filename The name of the file to delete
   * @param folder Optional subfolder name
   */
  async deleteFile(filename: string, folder?: string): Promise<void> {
    const filePath = folder 
      ? path.join(this.uploadsDest, folder, filename)
      : path.join(this.uploadsDest, filename);
      
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error(`Error deleting file: ${filePath}`, error);
      throw new InternalServerErrorException("Could not delete file from local storage");
    }
  }
}
