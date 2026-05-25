import { getCollection } from 'astro:content';
const publicationsFromZotero = await getCollection('publicationsFromZotero');

import type { CollectionEntry } from 'astro:content';

// Zotero datatypes as defined using zod in content.config.ts
type PublicationFromZotero = CollectionEntry<'publicationsFromZotero'>;
type AuthorFromZotero = CollectionEntry<'publicationsFromZotero'>['data']['author'][number];

// Helper to format given name of the author to initials
function formatGivenName(givenName: string) {
    return givenName
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part[0] + '.')
        .join(' ');
}

// Helper to format one author name
function formatOneAuthor(author: AuthorFromZotero) {
    const lastName = author['non-dropping-particle']
        ? author['non-dropping-particle'] + ' ' + author['family']
        : author['family'];
    return formatGivenName(author['given']) + ' ' + lastName;
}

// Helper to format list of authors
export function formatAuthors(
    authors: AuthorFromZotero[],
    maxAuthors = 3,
) {
    const shownAuthors = authors
        .slice(0, maxAuthors)
        .map(formatOneAuthor)
        .join(', ');
    return authors.length > maxAuthors
        ? shownAuthors + ' et al.'
        : shownAuthors;
}

// Helper to get either DOI or URL from publication, if any
function getPublicationLink(pub: PublicationFromZotero) {
    if (pub.data['DOI']) {
        return {
            prefix: 'DOI: ',
            text: pub.data['DOI'],
            href: 'https://doi.org/' + pub.data['DOI'],
        };
    }
    if (pub.data['URL']) {
        const topLevelDomain = pub.data['URL']
            .split('//')[1]
            ?.split('/')[0]
        if (!topLevelDomain) {
            throw new Error('Could not process URL' + pub.data['URL']);
        }
        return {
            prefix: 'URL: ',
            text: topLevelDomain,
            href: pub.data['URL'],
        };
    }
    return null;
}

// Helper to filter nulls from array in type-safe way
function isNonNullable<T>(value: T): value is NonNullable<T> {
    return (value !== null) && (value !== undefined);
}

// Define arrays for each publication category.
// Convert the Zotero-datatype to homogeneous simplified type
// that will be used to output the actual HTML.
// The caterogies (types) coming from Zotero each have 
// partially different fields (see content.config.ts), so each
// category has to be handled separately

// Simplified homogenous types for outputting HTML
export type Publication = {
    title: string,
    authors: string,
    meta: string, // any metadata, e.g. Journal, conference location, ...
    link: { // optionally DOI or URL
        prefix: string,
        text: string,
        href: string
    } | null
}

export type PublicationCategory = {
    heading: string; // Headline to be printed
    slug: string // URL slug for anchor links
    publications: Publication[]; // list of pubs of this category
};

const theses: Publication[] = publicationsFromZotero.map((pub) => {
    if (pub.data['type'] !== 'thesis')
        return null;
    return {
        title: pub.data['title'],
        authors: formatAuthors(pub.data['author']),
        meta: [
            pub.data['genre'],
            pub.data['publisher'],
            pub.data['publisher-place'],
            pub.data['issued'].getFullYear().toString()
        ].filter(Boolean).join(', '),
        link: getPublicationLink(pub)
    };
}).filter(isNonNullable);

const journalArticles: Publication[] = publicationsFromZotero.map((pub) => {
    if (pub.data['type'] !== 'article-journal')
        return null;
    return {
        title: pub.data['title'],
        authors: formatAuthors(pub.data['author']),
        meta: [
            pub.data['container-title'],
            pub.data['volume'],
            pub.data['issue'],
            pub.data['issued'].getFullYear().toString()
        ].filter(Boolean).join(', '),
        link: getPublicationLink(pub)
    };
}).filter(isNonNullable);

const conferenceArticles: Publication[] = publicationsFromZotero.map((pub) => {
    if (pub.data['type'] !== 'paper-conference')
        return null;
    return {
        title: pub.data['title'],
        authors: formatAuthors(pub.data['author']),
        meta: [
            pub.data['container-title'],
            pub.data['event-place'],
            pub.data['publisher'],
            pub.data['issued'].getFullYear().toString()
        ].filter(Boolean).join(', '),
        link: getPublicationLink(pub)
    };
}).filter(isNonNullable);

const reports: Publication[] = publicationsFromZotero.map((pub) => {
    if (pub.data['type'] !== 'report')
        return null;
    return {
        title: pub.data['title'],
        authors: formatAuthors(pub.data['author']),
        meta: [
            pub.data['publisher'],
            pub.data['publisher-place'],
            pub.data['number'],
            pub.data['issued'].getFullYear().toString()
        ].filter(Boolean).join(', '),
        link: getPublicationLink(pub)
    };
}).filter(isNonNullable);

const talks: Publication[] = publicationsFromZotero.map((pub) => {
    if (pub.data['type'] !== 'speech')
        return null;
    if (pub.data['genre'] !== 'Talk')
        return null;
    return {
        title: pub.data['title'],
        authors: formatAuthors(pub.data['author']),
        meta: [
            'Presentation given at the ' + pub.data['event-title'],
            pub.data['event-place'],
            pub.data['issued'].getFullYear().toString()
        ].filter(Boolean).join(', '),
        link: getPublicationLink(pub)
    };
}).filter(isNonNullable);

const invitedTalks: Publication[] = publicationsFromZotero.map((pub) => {
    if (pub.data['type'] !== 'speech')
        return null;
    if (pub.data['genre'] !== 'Invited Talk')
        return null;
    return {
        title: pub.data['title'],
        authors: formatAuthors(pub.data['author']),
        meta: [
            'Presentation given at the ' + pub.data['event-title'],
            pub.data['event-place'],
            pub.data['issued'].getFullYear().toString()
        ].filter(Boolean).join(', '),
        link: getPublicationLink(pub)
    };
}).filter(isNonNullable);

const posters: Publication[] = publicationsFromZotero.map((pub) => {
    if (pub.data['type'] !== 'speech')
        return null;
    if (pub.data['genre'] !== 'Poster')
        return null;
    return {
        title: pub.data['title'],
        authors: formatAuthors(pub.data['author']),
        meta: [
            'Poster presented at the ' + pub.data['event-title'],
            pub.data['event-place'],
            pub.data['issued'].getFullYear().toString()
        ].filter(Boolean).join(', '),
        link: getPublicationLink(pub)
    };
}).filter(isNonNullable);

// Define and export array of publication categories
// together with printed category title. The order of this array
// determines the order in the output HTML.

export const publicationCategories: PublicationCategory[] = [
    {
        heading: 'Articles in peer-reviewed journals',
        slug: 'journal-articles',
        publications: journalArticles
    },
    {
        heading: 'Articles in conference proceedings',
        slug: 'conference-articles',
        publications: conferenceArticles
    },
    {
        heading: 'Theses',
        slug: 'theses',
        publications: theses
    },
    {
        heading: 'Technical reports',
        slug: 'reports',
        publications: reports
    },
    {
        heading: 'Invited talks',
        slug: 'invited-talks',
        publications: invitedTalks
    },
    {
        heading: 'Talks',
        slug: 'talks',
        publications: talks
    },
    {
        heading: 'Posters',
        slug: 'posters',
        publications: posters
    },
];