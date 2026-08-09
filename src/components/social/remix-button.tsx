"use client";

import { LoaderCircle, WandSparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function RemixButton({
  postId,
  className,
}: {
  postId: string;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function remix() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/community/posts/${postId}/remix`, {
        method: "POST",
      });
      const body = (await response.json()) as {
        targetPath?: string;
        prompt?: string | null;
        model?: string | null;
        sourcePostId?: string;
        message?: string;
      };
      if (response.status === 401) {
        router.push(
          `/login?next=${encodeURIComponent(`/inspire?remix=${postId}`)}`,
        );
        return;
      }
      if (!response.ok || !body.targetPath)
        throw new Error(body.message ?? "No se pudo abrir el estudio.");
      sessionStorage.setItem("bellas-artes-remix", JSON.stringify(body));
      router.push(body.targetPath);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudo abrir el estudio.",
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className={className}>
      <Button
        type="button"
        onClick={remix}
        disabled={loading}
        className="bg-violet-600 text-white shadow-lg shadow-violet-500/20 hover:bg-violet-500"
      >
        {loading ? <LoaderCircle className="animate-spin" /> : <WandSparkles />}{" "}
        Direct this
      </Button>
      {error && (
        <p role="status" className="mt-2 text-[10px] text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}
