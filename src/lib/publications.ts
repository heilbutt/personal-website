import { getCollection } from 'astro:content';
const publications = await getCollection( 'publications' );

import type { CollectionEntry } from 'astro:content';
type Publication = CollectionEntry<'publications'>;
type Author = CollectionEntry<'publications'>['data']['author'][number];

// Helper to format given name of the author to initials
function formatGivenName( givenName: string ) {
    return givenName
        .trim()
        .split( /\s+/ )
        .filter( Boolean )
        .map( ( part ) => { part[0] + '.'; } )
        .join( " " );
}

// Helper to format one author name
function formatOneAuthor( author: Author ) {
    const lastName = author['non-dropping-particle']
        ? author['non-dropping-particle'] + ' ' + author['family']
        : author['family'];
    return formatGivenName( author['given'] ) + ' ' + lastName;
}

// Helper to format list of authors
export function formatAuthors(
    authors: Author[],
    maxAuthors = 3,
) {
    const shownAuthors = authors.slice( 0, maxAuthors ).map( formatOneAuthor );
    return authors.length > maxAuthors
        ? shownAuthors + 'et al.'
        : shownAuthors.join( ", " );
}

// Helper to get either DOI or URL from publication, if any
function getPublicationLink( pub: Publication ) {
    if ( pub.data['DOI'] ) {
        return {
            text: 'DOI: ' + pub.data['DOI'],
            href: 'https://doi.org/' + pub.data['DOI'],
        };
    }
    if ( pub.data['URL'] ) {
        return {
            text: pub.data['URL'],
            href: pub.data['URL'],
        };
    }
    return null;
}

// Helper to filter nulls from array in type-safe way
function isNonNullable<T>(value: T): value is NonNullable<T> {
    return (value !== null) && (value !== undefined);
}

// Define and export arrays for each publication type

export const theses = publications.map( ( pub ) => {
    if ( pub.data['type'] !== 'thesis' )
        return null;
    return {
        title: pub.data['title'],
        authors: formatAuthors( pub.data['author'] ),
        meta: [
            pub.data['genre'],
            pub.data['publisher'],
            pub.data['publisher-place'],
            pub.data['issued'].getFullYear().toString()
        ].filter(Boolean).join(', '),
        link: getPublicationLink( pub )
    };
} ).filter(isNonNullable);

export const journalArticles = publications.map( ( pub ) => {
    if ( pub.data['type'] !== 'article-journal' )
        return null;
    return {
        title: pub.data['title'],
        authors: formatAuthors( pub.data['author'] ),
        meta: [
            pub.data['container-title'],
            pub.data['volume'],
            pub.data['issue'],
            pub.data['issued'].getFullYear().toString()
        ].filter(Boolean).join(', '),
        link: getPublicationLink( pub )
    };
} ).filter(isNonNullable);

export const conferencePapers = publications.map( ( pub ) => {
    if ( pub.data['type'] !== 'paper-conference' )
        return null;
    return {
        title: pub.data['title'],
        authors: formatAuthors( pub.data['author'] ),
        meta: [
            pub.data['container-title'],
            pub.data['event-place'],
            pub.data['publisher'],
            pub.data['issued'].getFullYear().toString()
        ].filter(Boolean).join(', '),
        link: getPublicationLink( pub )
    };
} ).filter(isNonNullable);

export const reports = publications.map( ( pub ) => {
    if ( pub.data['type'] !== 'report' )
        return null;
    return {
        title: pub.data['title'],
        authors: formatAuthors( pub.data['author'] ),
        meta: [
            pub.data['publisher'],
            pub.data['publisher-place'],
            pub.data['number'],
            pub.data['issued'].getFullYear().toString()
        ].filter(Boolean).join(', '),
        link: getPublicationLink( pub )
    };
} ).filter(isNonNullable);

export const talks = publications.map( ( pub ) => {
    if ( pub.data['type'] !== 'speech' )
        return null;
    if (pub.data['genre'] !== 'Talk' )
        return null;
    return {
        title: pub.data['title'],
        authors: formatAuthors( pub.data['author'] ),
        meta: [
            'Presentation given at the ' + pub.data['event-title'],
            pub.data['event-place'],
            pub.data['issued'].getFullYear().toString()
        ].filter(Boolean).join(', '),
        link: getPublicationLink( pub )
    };
} ).filter(isNonNullable);

export const invitedTalks = publications.map( ( pub ) => {
    if ( pub.data['type'] !== 'speech' )
        return null;
    if (pub.data['genre'] !== 'Invited Talk' )
        return null;
    return {
        title: pub.data['title'],
        authors: formatAuthors( pub.data['author'] ),
        meta: [
            'Presentation given at the ' + pub.data['event-title'],
            pub.data['event-place'],
            pub.data['issued'].getFullYear().toString()
        ].filter(Boolean).join(', '),
        link: getPublicationLink( pub )
    };
} ).filter(isNonNullable);

export const posters = publications.map( ( pub ) => {
    if ( pub.data['type'] !== 'speech' )
        return null;
    if (pub.data['genre'] !== 'Poster' )
        return null;
    return {
        title: pub.data['title'],
        authors: formatAuthors( pub.data['author'] ),
        meta: [
            'Poster presented at the ' + pub.data['event-title'],
            pub.data['event-place'],
            pub.data['issued'].getFullYear().toString()
        ].filter(Boolean).join(', '),
        link: getPublicationLink( pub )
    };
} ).filter(isNonNullable);