import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

// Content collection:
// List of publications

// Scheme for one author
const PublicationPersonSchema = z.object({
    'family': z.string(),
    'given': z.string()
})

// Scheme for date (month and day optional)
const PublicationDateSchema = z.object({
    'date-parts': z.array(
        z.array(z.coerce.number().int())
    )
}).transform((value) => {
    // replace date-parts array with JS Date instance
    const firstEntry = value['date-parts'][0];
    if (!firstEntry) {
        throw new Error('Missing date-parts entry');
    }
    const [year, month, day] = firstEntry;
    if (!year) {
        throw new Error('Missing year');
    }
    const jsMonth = month != null ? month - 1 : 0; // JS months are 0-indexed
    const jsDay = day != null ? day : 1;
    return new Date(year, jsMonth, jsDay);
});

// Scheme for publication entry
const PublicationSchema = z.object({
    'id': z.string(), // citation key
    'type': z.string(), // e.g. paper-conference, article-journal, ...
    'title': z.string(),
    'author': z.array(PublicationPersonSchema),
    'issued': PublicationDateSchema, // publication date
    'container-title': z.string(), // Journal or proceedings title
    'publisher': z.string().optional(),
    'issue': z.string().optional(),
    'volume': z.string().optional(),
    'page': z.string().optional(),
    'DOI': z.string().optional(),
    'URL': z.url().optional()
});

const publications = defineCollection({
    loader: file('./src/content/publications/publications.json'),
    schema: PublicationSchema
})

// Make content collections available

export const collections = { publications };