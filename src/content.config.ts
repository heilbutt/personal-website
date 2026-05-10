import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

// Content collection: List of publications
// Parses a JSON created by Zotero's BetterBibTeX Better CSL JSON exporter

// Schema for one author
const publicationPersonSchema = z.object( {
    'family': z.string(),
    'given': z.string(),
    'non-dropping-particle': z.string().optional()
} );

// Schema for date (month and day optional)
const publicationDateSchema = z.object( {
    'date-parts': z.array(
        z.array( z.coerce.number().int() )
    )
} ).transform( ( value ) => {
    // replace date-parts array with JS Date instance
    const firstEntry = value['date-parts'][0];
    if ( !firstEntry ) {
        throw new Error( 'Missing date-parts entry' );
    }
    const [year, month, day] = firstEntry;
    if ( !year ) {
        throw new Error( 'Missing year' );
    }
    const jsMonth = month != null ? month - 1 : 0; // JS months are 0-indexed
    const jsDay = day != null ? day : 1;
    return new Date( year, jsMonth, jsDay );
} );

// Base schema for a generic publication
const basePublicationSchema = z.object( {
    'title': z.string(),
    'type': z.string(),
    'author': z.array( publicationPersonSchema ),
    'issued': publicationDateSchema,
    'DOI': z.string().optional(),
    'URL': z.url().optional()
} );

// Schema for thesis
const thesisSchema = basePublicationSchema.extend( {
    'type': z.literal( 'thesis' ),
    'publisher': z.string(), // Zotero GUI: `University`
    'publisher-place': z.string(), // Zotero GUI: `Place`
    'genre': z.string() // Zotero GUI: `Type`
} );

// Schema for articles in peer-reviewed journals
const articleSchema = basePublicationSchema.extend( {
    'type': z.literal( 'article-journal' ),
    'container-title': z.string(), // Journal
    'publisher': z.string().optional(),
    'issue': z.string().optional(),
    'volume': z.string().optional(),
    'page': z.string().optional(),
} );

// Schema for articles in conference proceedings
const conferencePaperSchema = basePublicationSchema.extend( {
    'type': z.literal( 'paper-conference' ),
    'title': z.string(),
    'author': z.array( publicationPersonSchema ),
    'issued': publicationDateSchema,
    'container-title': z.string(), // Proceedings title
    'event-place': z.string(), // Conference venue, Zotero GUI: `Event Place`
    'publisher': z.string().optional(),
    'page': z.string().optional(),
} );

// Schema for reports
const reportSchema = basePublicationSchema.extend( {
    'type': z.literal( 'report' ),
    'publisher': z.string(), // Zotero GUI: `Institution`
    'publisher-place': z.string(), // Zotero GUI: `Place`
    'number': z.string() // Zotero GUI: `Report Number`
} );

// Schema for presentations, can be talks, invited talks, posters
const presentationSchema = basePublicationSchema.extend( {
    'type': z.literal( 'speech' ), // Zotero GUI: `Item Type`
    'genre': z.enum( ['Talk', 'Invited Talk', 'Poster'] ), // Zotero GUI: `Type`
    'event-title': z.string(), // Zotero GUI: `Meeting Name`
    'event-place': z.string(), // Zotero GUI: `Place`
} );

// Union schema for publication entry
const publicationSchema = z.discriminatedUnion( 'type', [
    thesisSchema,
    articleSchema,
    conferencePaperSchema,
    presentationSchema,
    reportSchema
] );

// Define collections and export
export const collections = {
    publications: defineCollection( {
        loader: file( './src/content/publications/publications.json' ),
        schema: publicationSchema
    } )
};