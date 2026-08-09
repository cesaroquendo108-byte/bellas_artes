import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockSend, mockGetSignedUrl, mockS3ClientConstructor, mockPutObjectCommand, mockGetObjectCommand, mockDeleteObjectCommand } = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockGetSignedUrl: vi.fn(),
  mockS3ClientConstructor: vi.fn(),
  mockPutObjectCommand: vi.fn(),
  mockGetObjectCommand: vi.fn(),
  mockDeleteObjectCommand: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@aws-sdk/client-s3", () => {
  return {
    S3Client: class {
      constructor(config: unknown) {
        mockS3ClientConstructor(config);
      }
      send(command: unknown) {
        return mockSend(command);
      }
    },
    PutObjectCommand: class {
      constructor(input: Record<string, unknown>) {
        mockPutObjectCommand(input);
        Object.assign(this, input);
      }
    },
    GetObjectCommand: class {
      constructor(input: Record<string, unknown>) {
        mockGetObjectCommand(input);
        Object.assign(this, input);
      }
    },
    DeleteObjectCommand: class {
      constructor(input: Record<string, unknown>) {
        mockDeleteObjectCommand(input);
        Object.assign(this, input);
      }
    },
  };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: mockGetSignedUrl,
}));

import { _resetR2ClientForTesting, deletePrivateObject, getPrivateObjectUrl, uploadPrivateObject } from "./r2";

describe("lib/storage/r2", () => {
  const envBackup = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    _resetR2ClientForTesting();
    process.env = {
      ...envBackup,
      CLOUDFLARE_R2_ACCOUNT_ID: "test-account-id",
      CLOUDFLARE_R2_ACCESS_KEY_ID: "test-access-key",
      CLOUDFLARE_R2_SECRET_ACCESS_KEY: "test-secret-key",
      CLOUDFLARE_R2_BUCKET: "test-bucket-name",
    };
  });

  afterEach(() => {
    process.env = envBackup;
  });

  describe("uploadPrivateObject", () => {
    it("sube un objeto privado con parámetros mínimos y retorna la clave", async () => {
      mockSend.mockResolvedValueOnce({});
      const body = new Uint8Array([1, 2, 3]);

      const result = await uploadPrivateObject({
        key: "assets/sample.png",
        body,
        contentType: "image/png",
      });

      expect(result).toBe("assets/sample.png");
      expect(mockPutObjectCommand).toHaveBeenCalledWith({
        Bucket: "test-bucket-name",
        Key: "assets/sample.png",
        Body: body,
        ContentType: "image/png",
        Metadata: undefined,
      });
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("sube un objeto privado con metadatos opcionales", async () => {
      mockSend.mockResolvedValueOnce({});
      const body = new Uint8Array([4, 5, 6]);
      const metadata = { owner: "user-123", category: "proof" };

      const result = await uploadPrivateObject({
        key: "assets/doc.pdf",
        body,
        contentType: "application/pdf",
        metadata,
      });

      expect(result).toBe("assets/doc.pdf");
      expect(mockPutObjectCommand).toHaveBeenCalledWith({
        Bucket: "test-bucket-name",
        Key: "assets/doc.pdf",
        Body: body,
        ContentType: "application/pdf",
        Metadata: metadata,
      });
    });

    it("propaga errores cuando la subida a R2 falla", async () => {
      mockSend.mockRejectedValueOnce(new Error("R2 storage quota exceeded"));

      await expect(
        uploadPrivateObject({
          key: "assets/fail.jpg",
          body: new Uint8Array([]),
          contentType: "image/jpeg",
        }),
      ).rejects.toThrow("R2 storage quota exceeded");
    });
  });

  describe("getPrivateObjectUrl", () => {
    it("genera una URL firmada con tiempo de expiración por defecto (900s)", async () => {
      mockGetSignedUrl.mockResolvedValueOnce("https://r2.example.com/signed-url");

      const url = await getPrivateObjectUrl("assets/sample.png");

      expect(url).toBe("https://r2.example.com/signed-url");
      expect(mockGetObjectCommand).toHaveBeenCalledWith({
        Bucket: "test-bucket-name",
        Key: "assets/sample.png",
      });
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          Bucket: "test-bucket-name",
          Key: "assets/sample.png",
        }),
        { expiresIn: 900 },
      );
    });

    it("genera una URL firmada con tiempo de expiración personalizado", async () => {
      mockGetSignedUrl.mockResolvedValueOnce("https://r2.example.com/custom-signed-url");

      const url = await getPrivateObjectUrl("assets/sample.png", 3600);

      expect(url).toBe("https://r2.example.com/custom-signed-url");
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 3600 },
      );
    });

    it("propaga errores al fallar la generación de la URL firmada", async () => {
      mockGetSignedUrl.mockRejectedValueOnce(new Error("Presigner failure"));

      await expect(getPrivateObjectUrl("assets/error.png")).rejects.toThrow("Presigner failure");
    });
  });

  describe("deletePrivateObject", () => {
    it("elimina un objeto privado exitosamente", async () => {
      mockSend.mockResolvedValueOnce({});

      await deletePrivateObject("assets/to-delete.png");

      expect(mockDeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: "test-bucket-name",
        Key: "assets/to-delete.png",
      });
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("propaga errores al fallar la eliminación en R2", async () => {
      mockSend.mockRejectedValueOnce(new Error("Object not found in R2"));

      await expect(deletePrivateObject("assets/non-existent.png")).rejects.toThrow("Object not found in R2");
    });
  });
});
