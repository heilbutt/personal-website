import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import yaml from 'js-yaml';

// =============================================================================
// Publications from Zotero's BetterBibTeX Better CSL YAML exporter
// =============================================================================

// Parses a YAML file created by Zotero's BetterBibTeX Better CSL YAML exporter.
// The file wraps the actual list of publications in a top-level `references`
// key, so it needs a custom parser to hand the loader the bare array.
function parseCslYaml(text: string) {
    const { references } = yaml.load(text) as { references: Record<string, unknown>[] };
    return references;
}

// Schema for one author
const publicationPersonSchema = z.object({
    'family': z.string(),
    'given': z.string(),
    'non-dropping-particle': z.string().optional()
});

// Schema for date (month and day optional)
const publicationDateSchema = z.array(
    z.object({
        'year': z.coerce.number().int(),
        'month': z.coerce.number().int().optional(),
        'day': z.coerce.number().int().optional(),
    })
).transform((value) => {
    // replace issued array with JS Date instance
    const firstEntry = value[0];
    if (!firstEntry) {
        throw new Error('Missing issued date entry');
    }
    const jsMonth = firstEntry.month != null ? firstEntry.month - 1 : 0; // JS months are 0-indexed
    const jsDay = firstEntry.day ?? 1;
    return new Date(firstEntry.year, jsMonth, jsDay);
});

// Base schema for a generic publication
const basePublicationSchema = z.object({
    'title': z.string(),
    'type': z.string(),
    'author': z.array(publicationPersonSchema),
    'issued': publicationDateSchema,
    'DOI': z.string().optional(),
    'URL': z.url().optional()
});

// Schema for thesis
const thesisSchema = basePublicationSchema.extend({
    'type': z.literal('thesis'),
    'publisher': z.string(), // Zotero GUI: `University`
    'publisher-place': z.string(), // Zotero GUI: `Place`
    'genre': z.string() // Zotero GUI: `Type`
});

// Schema for articles in peer-reviewed journals
const articleSchema = basePublicationSchema.extend({
    'type': z.literal('article-journal'),
    'container-title': z.string(), // Journal
    'publisher': z.string().optional(),
    'issue': z.string().optional(),
    'volume': z.string().optional(),
    'page': z.string().optional(),
});

// Schema for articles in conference proceedings
const conferencePaperSchema = basePublicationSchema.extend({
    'type': z.literal('paper-conference'),
    'container-title': z.string(), // Proceedings title
    'event-place': z.string(), // Conference venue, Zotero GUI: `Event Place`
    'publisher': z.string().optional(),
    'page': z.string().optional(),
});

// Schema for reports
const reportSchema = basePublicationSchema.extend({
    'type': z.literal('report'),
    'publisher': z.string(), // Zotero GUI: `Institution`
    'publisher-place': z.string(), // Zotero GUI: `Place`
    'number': z.string() // Zotero GUI: `Report Number`
});

// Schema for presentations (Zotero speech), can be talks, invited talks, posters
const speechSchema = basePublicationSchema.extend({
    'type': z.literal('speech'), // Zotero GUI: `Item Type`
    'genre': z.enum(['Talk', 'Invited Talk', 'Poster']), // Zotero GUI: `Type`
    'event-title': z.string(), // Zotero GUI: `Meeting Name`
    'event-place': z.string(), // Zotero GUI: `Place`
});

// Union schema for publication entry
const publicationSchema = z.discriminatedUnion('type', [
    thesisSchema,
    articleSchema,
    conferencePaperSchema,
    speechSchema,
    reportSchema
]);

// Collection of publications, exported from Zotero
export const publicationsFromZotero = defineCollection({
    loader: file('./src/content/publications.yaml', { parser: parseCslYaml }),
    schema: publicationSchema
});

// =============================================================================
// Photo gallery
// =============================================================================

// Each image media/originals/<album>/<photo>.<ext> (gitignored)
// is paired by path with src/content/gallery/<album>/<photo>.yaml (committed).
// Each album also needs a <album>/_album.yaml.
// See lib/gallery.ts.

// Allowed photo licenses with the URL of their legal text
export const LICENSE_URLS = {
    'CC0-1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
    'CC-BY-4.0': 'https://creativecommons.org/licenses/by/4.0/',
    'CC-BY-SA-4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
    'CC-BY-NC-4.0': 'https://creativecommons.org/licenses/by-nc/4.0/',
    'CC-BY-NC-SA-4.0': 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    'CC-BY-ND-4.0': 'https://creativecommons.org/licenses/by-nd/4.0/',
    'CC-BY-NC-ND-4.0': 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
    'all-rights-reserved': null,
} as const;

// Zod schema for one photo
const photoSchema = z.object({
    'title': z.string(),
    'description': z.string().optional(),
    'date': z.date(),
    'author': z.string(),
    'license': z.enum(Object.keys(LICENSE_URLS) as [keyof typeof LICENSE_URLS]),
    'location': z.string().optional(), // free text, never GPS coordinates
    'camera': z.string().optional(),
    'lens': z.string().optional(),
    'exposure': z.string().optional(), // e.g. "1/250 s, f/8, ISO 100, 35 mm"
    'draft': z.boolean().default(false) // if true, hides the photo
});

// Zod schema for one album
const albumSchema = z.object({
    'title': z.string(),
    'description': z.string().optional(),
    'cover': z.string().optional(), // photo file name stem, default: first photo
    'draft': z.boolean().default(false) // if true, hides the album
});

// Photos: src/content/gallery/<album>/<photo>.yaml, id "<album>/<photo>"
export const galleryPhotos = defineCollection({
    loader: glob({
        base: './src/content/gallery',
        pattern: ['**/*.yaml', '!**/_album.yaml'],
        generateId: ({ entry }) => entry.replace(/\.yaml$/, ''),
    }),
    schema: photoSchema
});

// Albums: src/content/gallery/<album>/_album.yaml, id "<album>"
export const galleryAlbums = defineCollection({
    loader: glob({
        base: './src/content/gallery',
        pattern: '**/_album.yaml',
        generateId: ({ entry }) => entry.replace(/\/_album\.yaml$/, ''),
    }),
    schema: albumSchema
});

// =============================================================================
// Collections, as read by Astro
// =============================================================================
export const collections = {
    publicationsFromZotero,
    galleryPhotos,
    galleryAlbums
};
