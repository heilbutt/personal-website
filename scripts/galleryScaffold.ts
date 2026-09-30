// Creates the missing gallery YAML files, filled in from the image EXIF data.
// Run with `npm run gallery:scaffold` after adding photos to media/originals/<album>/.
// This script runs in plain Node, so must not import anything from Astro.

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import exifr from 'exifr';

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_AUTHOR = 'Hermann Pommerenke';
const DEFAULT_LICENSE = 'CC-BY-4.0';

// Original image files (not in repo): media/originals/<album>/<photo>.<ext>
const ORIGINALS_DIR = 'media/originals'; 
// YAML files (in repo): src/content/gallery/<album>/<photo>.yaml and <album>/_album.yaml
const CONTENT_DIR = 'src/content/gallery';
// All originals. Includes nested directories, so they can be reported as errors.
const ORIGINALS_GLOB = `${ORIGINALS_DIR}/**/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG}`;

// =============================================================================
// Helper functions
// =============================================================================

// Get title from XMP dc:title (Lightroom, darktable), IPTC, or Windows metadata.
// XMP titles come as { lang, value }, a list of those, or a plain string.
function getTitleFromExif(exif: Record<string, any>): string | undefined {
    const xmpTitle = [exif.title].flat()[0];
    return xmpTitle?.value ?? xmpTitle ?? exif.ObjectName ?? exif.XPTitle;
}

// Get title from file name (e.g. "zermatt-night" -> "Zermatt night")
function getTitleFromName(name: string): string {
    const words = name.replace(/[-_]/g, ' ');
    return words.charAt(0).toUpperCase() + words.slice(1);
}

// Format exposure string (e.g. "1/250 s, f/8, ISO 100, 35 mm")
// function getExposureFromExif(exif: Record<string, any>): string | undefined {
//     const { ExposureTime: time, FNumber: aperture, ISO: iso, FocalLength: focal } = exif;
//     const parts = [
//         time && (time < 1 ? `1/${Math.round(1 / time)} s` : `${time} s`),
//         aperture && `f/${aperture}`,
//         iso && `ISO ${iso}`,
//         focal && `${Math.round(focal)} mm`,
//     ];
//     return parts.filter(Boolean).join(', ') || undefined;
// }

// Format camera name (e.g. "Canon" + "Canon EOS R5" -> "Canon EOS R5")
function formatCamera(make?: string, model?: string): string | undefined {
    return make && model && !model.startsWith(make) ? `${make} ${model}` : model ?? make;
}

// Format date to "2025-08-14".
function formatDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Get metadata of photo from its EXIF data
async function photoData(image: string, stem: string) {
    const exif = (await exifr.parse(image, { xmp: true, iptc: true })) ?? {};
    const date: Date | undefined = exif.DateTimeOriginal ?? exif.CreateDate;
    return {
        title: getTitleFromExif(exif) || getTitleFromName(stem),
        description: '',
        date: date && formatDate(date), // left out if unknown, the build will ask for it
        author: exif.Artist || DEFAULT_AUTHOR,
        license: DEFAULT_LICENSE,
        camera: formatCamera(exif.Make, exif.Model),
        lens: exif.LensModel,
        focalLength: exif.FocalLength,
        exposureTime: exif.ExposureTime,
        fNumber: exif.FNumber,
        iso: exif.iso
    };
}

// Write YAML file
function writeYaml(file: string, data: object) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const text = yaml
        .dump(data, { skipInvalid: true }) // skips undefined fields
        .replace(/^date: '(.+)'$/m, 'date: $1'); // unquote, so YAML reads it as a date
    fs.writeFileSync(file, text);
    console.log(`created ${file}`);
}

// =============================================================================
// Entry point
// =============================================================================

// Glob all original images
for (const imagePath of fs.globSync(ORIGINALS_GLOB)) {

       const relativePath = path.relative(ORIGINALS_DIR, imagePath); // "<album>/<photo>.<ext>"
    
    // Skip images not directly inside an album with a log entry for now.
    // Will throw and error later at build time
    if (relativePath.split(path.sep).length !== 2) {
        console.log(`skipped ${imagePath}: photos must be directly inside an album directory`);
        continue;
    }
    const { dir: albumName, name: imageStem } = path.parse(relativePath);

    // Yaml for the album
    const albumYaml = path.join(CONTENT_DIR, albumName, '_album.yaml');
    if (!fs.existsSync(albumYaml)) {
        writeYaml(albumYaml, { title: getTitleFromName(albumName), description: '' });
    }

    // Yaml for the photo
    const photoYaml = path.join(CONTENT_DIR, albumName, imageStem + '.yaml');
    if (!fs.existsSync(photoYaml)) {
        writeYaml(photoYaml, await photoData(imagePath, imageStem));
    }
}
