import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockSend,
  mockGetSignedUrl,
  mockS3ClientConstructor,
  mockPutObjectCommand,
  mockGetObjectCommand,
  mockDeleteObjectCommand,
} = vi.hoisted(() => ({
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

describe("lib/storage/r2 empirical stress tests", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    _resetR2ClientForTesting();
    process.env = {
      ...envBackup,
      CLOUDFLARE_R2_ACCOUNT_ID: "acc-12345",
      CLOUDFLARE_R2_ACCESS_KEY_ID: "key-abcde",
      CLOUDFLARE_R2_SECRET_ACCESS_KEY: "secret-xyz",
      CLOUDFLARE_R2_BUCKET: "my-test-bucket",
    };
  });

  afterEach(() => {
    process.env = envBackup;
  });

  describe("Environment variable validation & resiliency", () => {
    it("fails with explicit error message when CLOUDFLARE_R2_ACCOUNT_ID is missing", async () => {
      delete process.env.CLOUDFLARE_R2_ACCOUNT_ID;
      await expect(
        uploadPrivateObject({
          key: "test.png",
          body: new Uint8Array([1]),
          contentType: "image/png",
        }),
      ).rejects.toThrow("Falta la variable de entorno obligatoria: CLOUDFLARE_R2_ACCOUNT_ID");
    });

    it("fails with explicit error message when CLOUDFLARE_R2_ACCESS_KEY_ID is missing", async () => {
      delete process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
      await expect(
        getPrivateObjectUrl("test.png"),
      ).rejects.toThrow("Falta la variable de entorno obligatoria: CLOUDFLARE_R2_ACCESS_KEY_ID");
    });

    it("fails with explicit error message when CLOUDFLARE_R2_SECRET_ACCESS_KEY is missing", async () => {
      delete process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
      await expect(
        deletePrivateObject("test.png"),
      ).rejects.toThrow("Falta la variable de entorno obligatoria: CLOUDFLARE_R2_SECRET_ACCESS_KEY");
    });

    it("fails with explicit error message when CLOUDFLARE_R2_BUCKET is missing", async () => {
      delete process.env.CLOUDFLARE_R2_BUCKET;
      await expect(
        uploadPrivateObject({
          key: "test.png",
          body: new Uint8Array([1]),
          contentType: "image/png",
        }),
      ).rejects.toThrow("Falta la variable de entorno obligatoria: CLOUDFLARE_R2_BUCKET");
    });
  });

  describe("uploadPrivateObject stress tests", () => {
    it("handles zero-byte empty Uint8Array body", async () => {
      mockSend.mockResolvedValueOnce({});
      const emptyBody = new Uint8Array(0);

      const result = await uploadPrivateObject({
        key: "empty.txt",
        body: emptyBody,
        contentType: "text/plain",
      });

      expect(result).toBe("empty.txt");
      expect(mockPutObjectCommand).toHaveBeenCalledWith({
        Bucket: "my-test-bucket",
        Key: "empty.txt",
        Body: emptyBody,
        ContentType: "text/plain",
        Metadata: undefined,
      });
    });

    it("handles large payloads (10MB)", async () => {
      mockSend.mockResolvedValueOnce({});
      const largeBody = new Uint8Array(10 * 1024 * 1024);

      const result = await uploadPrivateObject({
        key: "large.bin",
        body: largeBody,
        contentType: "application/octet-stream",
      });

      expect(result).toBe("large.bin");
      expect(largeBody.byteLength).toBe(10 * 1024 * 1024);
      expect(mockPutObjectCommand).toHaveBeenCalledWith({
        Bucket: "my-test-bucket",
        Key: "large.bin",
        Body: expect.any(Uint8Array),
        ContentType: "application/octet-stream",
        Metadata: undefined,
      });
    });

    it("passes keys with special characters, unicode, path traversal strings as-is", async () => {
      mockSend.mockResolvedValueOnce({});
      const keyWithSpecialChars = "folder/../sub/españa & test #1.jpg";

      const result = await uploadPrivateObject({
        key: keyWithSpecialChars,
        body: new Uint8Array([65]),
        contentType: "image/jpeg",
      });

      expect(result).toBe(keyWithSpecialChars);
      expect(mockPutObjectCommand).toHaveBeenCalledWith({
        Bucket: "my-test-bucket",
        Key: keyWithSpecialChars,
        Body: expect.any(Uint8Array),
        ContentType: "image/jpeg",
        Metadata: undefined,
      });
    });

    it("handles empty key string without client-side validation error", async () => {
      mockSend.mockResolvedValueOnce({});

      const result = await uploadPrivateObject({
        key: "",
        body: new Uint8Array([1]),
        contentType: "application/octet-stream",
      });

      expect(result).toBe("");
      expect(mockPutObjectCommand).toHaveBeenCalledWith({
        Bucket: "my-test-bucket",
        Key: "",
        Body: expect.any(Uint8Array),
        ContentType: "application/octet-stream",
        Metadata: undefined,
      });
    });

    it("propagates S3 rate-limiting (429) errors", async () => {
      const error = new Error("Too Many Requests");
      (error as unknown as { $metadata: { httpStatusCode: number } }).$metadata = { httpStatusCode: 429 };
      mockSend.mockRejectedValueOnce(error);

      await expect(
        uploadPrivateObject({
          key: "test.png",
          body: new Uint8Array([1]),
          contentType: "image/png",
        }),
      ).rejects.toThrow("Too Many Requests");
    });
  });

  describe("getPrivateObjectUrl stress tests", () => {
    it("handles custom expiresIn equal to 0", async () => {
      mockGetSignedUrl.mockResolvedValueOnce("https://r2.example.com/expired-url");

      const url = await getPrivateObjectUrl("test.png", 0);

      expect(url).toBe("https://r2.example.com/expired-url");
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 0 },
      );
    });

    it("handles negative expiresIn without throwing client-side validation error", async () => {
      mockGetSignedUrl.mockResolvedValueOnce("https://r2.example.com/neg-url");

      const url = await getPrivateObjectUrl("test.png", -100);

      expect(url).toBe("https://r2.example.com/neg-url");
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: -100 },
      );
    });

    it("handles max S3 presigned URL expiration (604800s - 7 days)", async () => {
      mockGetSignedUrl.mockResolvedValueOnce("https://r2.example.com/7days-url");

      const url = await getPrivateObjectUrl("test.png", 604800);

      expect(url).toBe("https://r2.example.com/7days-url");
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 604800 },
      );
    });
  });

  describe("deletePrivateObject stress tests", () => {
    it("passes delete command for key with empty string", async () => {
      mockSend.mockResolvedValueOnce({});

      await deletePrivateObject("");

      expect(mockDeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: "my-test-bucket",
        Key: "",
      });
    });

    it("propagates AWS NoSuchBucket / AccessDenied exceptions", async () => {
      const error = new Error("Access Denied");
      (error as unknown as { Code: string }).Code = "AccessDenied";
      mockSend.mockRejectedValueOnce(error);

      await expect(deletePrivateObject("forbidden.png")).rejects.toThrow("Access Denied");
    });
  });

  describe("S3Client singleton instance lifecycle", () => {
    it("verifies S3Client constructor endpoint and credentials format", async () => {
      _resetR2ClientForTesting();
      mockSend.mockResolvedValueOnce({});
      await uploadPrivateObject({
        key: "check.png",
        body: new Uint8Array([1]),
        contentType: "image/png",
      });

      expect(mockS3ClientConstructor).toHaveBeenCalledWith({
        region: "auto",
        endpoint: "https://acc-12345.r2.cloudflarestorage.com",
        credentials: {
          accessKeyId: "key-abcde",
          secretAccessKey: "secret-xyz",
        },
      });
    });
  });
});
