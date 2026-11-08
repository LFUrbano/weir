"use client";

import { IMAGE_SIZE } from "@/data/models";
import { endpointPath, modelKind, type ModelKind } from "@/lib/model-display";
import { useComparePair } from "./use-compare-pair";

/** The endpoint both models of the pair take: "/v1/chat/completions". */
export function PairEndpoint() {
  const { a } = useComparePair();
  return <>{endpointPath(a)}</>;
}

const VOLUME_LEDES: Record<ModelKind, string> = {
  chat: "Serverless price, with half input and half output tokens, the same split the calculator uses.",
  embeddings:
    "Serverless price for input tokens. Embedding models return vectors, so there are no output tokens to pay for.",
  image: `Serverless price per image, at ${IMAGE_SIZE.label}.`,
};

/** What the monthly estimate assumes, for the pair's kind. */
export function VolumeLede() {
  const { a } = useComparePair();
  return <>{VOLUME_LEDES[modelKind(a)]}</>;
}
