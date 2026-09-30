import { getCollection, type CollectionEntry } from 'astro:content';
import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import { LICENSE_URLS } from '../content-collections/gallery';

// Photo gallery: pairs originals with their YAML files, checks that they match
// up, and prepares the data for the pages. Schemas: collections/gallery.ts

type PhotoEntry = CollectionEntry<'galleryPhotos'>;

// Longest edge of the lightbox images in pixels. Images are never upscaled.
const LIGHTBOX_SIZE = 2560;

const problems: string[] = [];

// All originals, keyed by photo id "<album>/<photo>"
const originalFiles = import.meta.glob<ImageMetadata>(
    '/media/originals/**/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG}',
    { eager: true, import: 'default' }
);
const originals = new Map<string, ImageMetadata>();
for (const [file, image] of Object.entries(originalFiles)) {
    const id = file.replace('/media/originals/', '').replace(/\.[^.]+$/, '');
    if (originals.has(id)) {
        problems.push(`${file}: another image in this album has the same name`);
    }
    originals.set(id, image);
}

const photoEntries = await getCollection('galleryPhotos');
const albumEntries = await getCollection('galleryAlbums');

// Check that images, photo YAML files and album YAML files match up
const photoIds = new Set(photoEntries.map((entry) => entry.id));
const albumIds = new Set(albumEntries.map((entry) => entry.id));
for (const id of new Set([...originals.keys(), ...photoIds])) {
    const album = id.split('/')[0]!;
    if (id.split('/').length !== 2) {
        problems.push(`${id}: photos must be directly inside an album directory, no nesting`);
    } else if (!photoIds.has(id)) {
        problems.push(`src/content/gallery/${id}.yaml: missing, but the image exists`);
    } else if (!originals.has(id)) {
        problems.push(`media/originals/${id}.jpg (or other format): missing, but the YAML file exists`);
    } else if (!albumIds.has(album)) {
        problems.push(`src/content/gallery/${album}/_album.yaml: missing`);
    }
}
if (problems.length > 0) {
    throw new Error('Gallery check failed:\n  ' + [...new Set(problems)].join('\n  '));
}

// Photo data as defined in content.config.ts, plus what the pages need
export type GalleryPhoto = PhotoEntry['data'] & {
    name: string; // file name without extension, unique within the album
    original: ImageMetadata; // for <Image /> and getLightboxImage()
    dateText: string; // e.g. "14 August 2025"
    licenseUrl: string | null;
};

export type GalleryAlbum = {
    slug: string; // album directory name, used in the URL
    title: string;
    description: string | undefined;
    cover: GalleryPhoto;
    photos: GalleryPhoto[]; // oldest first
};

function toGalleryPhoto(entry: PhotoEntry): GalleryPhoto {
    return {
        ...entry.data,
        name: entry.id.split('/')[1]!,
        original: originals.get(entry.id)!,
        // dates without time zone are read as UTC, so format them in UTC too
        dateText: entry.data.date.toLocaleDateString('en-GB', {
            day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
        }),
        licenseUrl: LICENSE_URLS[entry.data.license],
    };
}

// All published albums, newest (by latest photo) first
export const galleryAlbums: GalleryAlbum[] = [];
for (const album of albumEntries.filter((entry) => !entry.data.draft)) {
    const photos = photoEntries
        .filter((photo) => !photo.data.draft && photo.id.startsWith(album.id + '/'))
        .map(toGalleryPhoto)
        .sort((a, b) => a.date.getTime() - b.date.getTime());
    if (photos.length === 0) {
        continue; // all photos are drafts
    }
    const cover = album.data.cover
        ? photos.find((photo) => photo.name === album.data.cover)
        : photos[0];
    if (!cover) {
        throw new Error(`Gallery: cover "${album.data.cover}" of album ${album.id} is not a (non-draft) photo of this album`);
    }
    galleryAlbums.push({ slug: album.id, title: album.data.title, description: album.data.description, cover, photos });
}
galleryAlbums.sort((a, b) => b.photos.at(-1)!.date.getTime() - a.photos.at(-1)!.date.getTime());

// Lightbox version of a photo: URL and size for PhotoSwipe.
// Call it while rendering a page, not while this module loads:
// getImage() at module load makes `astro build` hang.
export async function getLightboxImage(photo: GalleryPhoto) {
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
