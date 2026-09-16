import { defineCollection, z } from 'astro:content';

const logs = defineCollection({
  type: 'content',
  schema: z
    .object({
      date: z.date(),
      person: z.string(),
      status: z.enum(['completed', 'excused']).default('completed'),
      reason: z.string().optional(),
      topic: z.string().optional(),
      minutes: z.number().optional(),
      title: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })
    .refine(
      (entry) =>
        entry.status === 'completed'
          ? Boolean(entry.topic) && Boolean(entry.title) && typeof entry.minutes === 'number'
          : Boolean(entry.reason),
      {
        message:
          "a 'completed' entry requires topic, minutes, and title; an 'excused' entry requires a reason",
      }
    ),
});

const goals = defineCollection({
  type: 'content',
  schema: z.object({
    person: z.string(),
    topic: z.string(),
    title: z.string(),
    status: z.enum(['pending', 'in-progress', 'achieved', 'cancelled', 'idea']),
    scheduled_days: z
      .array(z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']))
      .optional(),
    started: z.date().optional(),
    target_date: z.date().optional(),
    updated: z.date(),
  }),
});

export const collections = { logs, goals };
