// Photo gallery: pairs originals with their YAML files, checks that they match
// up, and prepares the data for the pages. Schemas: content.config.ts

import { getCollection, type CollectionEntry } from 'astro:content';
import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import { LICENSE_URLS } from '../content.config';

// =============================================================================
// Configuration
// =============================================================================

// Original image files (not in repo): media/originals/<album>/<photo>.<ext>
const ORIGINALS_DIR = 'media/originals'; 
// YAML files (in repo): src/content/gallery/<album>/<photo>.yaml and <album>/_album.yaml
const CONTENT_DIR = 'src/content/gallery';

// Longest edge of the lightbox images in pixels. Paths: gallery.config.ts
const LIGHTBOX_SIZE = 2560;

// =============================================================================
// Check and generate the gallery data for the page
// =============================================================================

// Get collection entries
type PhotoCollectionEntry = CollectionEntry<'galleryPhotos'>;
type PhotoCollectionEntryData = PhotoCollectionEntry['data'];
const photoEntries = await getCollection('galleryPhotos');
const albumEntries = await getCollection('galleryAlbums');

// List of problems found with the gallery, to throw all at once
const problems: string[] = [];

// All originals, keyed by photo id "<album>/<photo>".
// import.meta.glob() only takes a literal: keep it equal to ORIGINALS_GLOB.
const originalFiles = import.meta.glob<ImageMetadata>(
    '/media/originals/**/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG}',
    { eager: true, import: 'default' }
);
const originals = new Map<string, ImageMetadata>();
for (const [file, image] of Object.entries(originalFiles)) {
    const id = file.replace(`/${ORIGINALS_DIR}/`, '').replace(/\.[^.]+$/, '');
    if (originals.has(id)) {
        problems.push(`${file}: another image in this album has the same name`);
    }
    originals.set(id, image);
}

// Check that images, photo YAML files and album YAML files match up
const photoIds = new Set(photoEntries.map((entry) => entry.id));
const albumIds = new Set(albumEntries.map((entry) => entry.id));
for (const id of new Set([...originals.keys(), ...photoIds])) {
    const album = id.split('/')[0]!;
    if (id.split('/').length !== 2) {
        problems.push(`${id}: photos must be directly inside an album directory, no nesting`);
    } else if (!photoIds.has(id)) {
        problems.push(`${CONTENT_DIR}/${id}.yaml: missing, but the image exists`);
    } else if (!originals.has(id)) {
        problems.push(`${ORIGINALS_DIR}/${id}.jpg (or other format): missing, but the YAML file exists`);
    } else if (!albumIds.has(album)) {
        problems.push(`${CONTENT_DIR}/${album}/_album.yaml: missing`);
    }
}
if (problems.length > 0) {
    throw new Error('Gallery check failed:\n  ' + [...new Set(problems)].join('\n  '));
}

// Photo data as defined in content.config.ts, plus what the pages need
export interface GalleryPhoto extends PhotoCollectionEntryData {
    stem: string; // file name without extension, unique within the album
    original: ImageMetadata; // for <Image /> and getPhotoSwipeImage()
    dateText: string; // e.g. "14 August 2025"
    exposureText: string | undefined; // e.g. "1/250 s, f/8, ISO 100, 35 mm"
    licenseUrl: string | null;
};

// Format exposure text based on image metadata
function formatExposure({ exposureTime, fNumber, iso, focalLength }: PhotoCollectionEntryData) {
    const parts = [
        exposureTime && (
            exposureTime < 1
            ? `1/${Math.round(1 / exposureTime)} s`
            : `${exposureTime} s`
        ),
        fNumber && `f/${fNumber}`,
        iso && `ISO ${iso}`,
        focalLength && `${Math.round(focalLength)} mm`,
    ];
    return parts.filter(Boolean).join(', ') || undefined;
}

// Convert the photo collection entry (zod scheme) to GalleryPhoto needed by the pages
function toGalleryPhoto(entry: PhotoCollectionEntry): GalleryPhoto {
    return {
        ...entry.data,
        stem: entry.id.split('/')[1]!,
        original: originals.get(entry.id)!,
        dateText: entry.data.date.toLocaleDateString('en-GB', {
            day: 'numeric', month: 'long', year: 'numeric'
        }),
        exposureText: formatExposure(entry.data),
        licenseUrl: LICENSE_URLS[entry.data.license],
    };
}

// Represents the album
export interface GalleryAlbum {
    slug: string; // album directory name, used in the URL
    title: string;
    description: string | undefined;
    cover: GalleryPhoto;
    photos: GalleryPhoto[]; // oldest first
};


// All published albums, newest (by latest photo) first
export const albums: GalleryAlbum[] = [];
for (const albumEntry of albumEntries.filter((entry) => !entry.data.draft)) {
    const photos = photoEntries
        .filter((photo) => !photo.data.draft && photo.id.startsWith(albumEntry.id + '/'))
        .map(toGalleryPhoto)
        .sort((a, b) => a.date.getTime() - b.date.getTime());
    if (photos.length === 0) {
        continue; // all photos are drafts
    }
    const cover = albumEntry.data.cover
        ? photos.find((photo) => photo.stem === albumEntry.data.cover)
        : photos[0];
    if (!cover) {
        throw new Error(`Gallery: cover "${albumEntry.data.cover}" of album ${albumEntry.id} is not a (non-draft) photo of this album`);
    }
    albums.push({
        slug: albumEntry.id,
        title: albumEntry.data.title,
        description: albumEntry.data.description,
        cover: cover,
        photos: photos
    });
}
albums.sort((a, b) => (
    b.photos.at(-1)!.date.getTime() - a.photos.at(-1)!.date.getTime()
));


// =============================================================================
// PhotoSwipe
// =============================================================================

// Lightbox version of a photo: URL and size for PhotoSwipe.
// Call it while rendering a page, not while this module loads:
// getImage() at module load makes `astro build` hang.
export async function getPhotoSwipeImage(photo: GalleryPhoto) {
    // Reading any property of an imported image makes Astro publish the
    // full-size original, EXIF and GPS data included. Read the size from a
    // clone instead, like Astro's own getImage() does.
    const { width, height } = (photo.original as ImageMetadata & { clone: ImageMetadata }).clone;
    const scale = Math.min(1, LIGHTBOX_SIZE / Math.max(width, height));
    const image = await getImage({ src: photo.original, width: Math.round(width * scale) });
    return {
        src: image.src,
        width: Number(image.attributes['width']),
        height: Number(image.attributes['height']),
    };
}
