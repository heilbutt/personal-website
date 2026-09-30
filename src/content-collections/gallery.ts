// Content collection: photo and album for the gallery

// Each image media/originals/<album>/<photo>.<ext> (gitignored)
// is paired by path with src/content/gallery/<album>/<photo>.yaml (committed).
// Each album also needs a <album>/_album.yaml.
// See lib/gallery.ts. 

import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

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
    'draft': z.boolean().default(false) // // if true, hides the album
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
