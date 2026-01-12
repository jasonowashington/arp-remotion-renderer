import { z } from "zod";

export const RenderRequestSchema = z.object({
  runId: z.string().min(1),
  composition: z.string().min(1),
  audioKey: z.string().min(1),
  propsKey: z.string().min(1),
  captionsKey: z.string().optional(),
  outputKey: z.string().min(1),
  logKey: z.string().min(1)
});

export type RenderRequest = z.infer<typeof RenderRequestSchema>;
