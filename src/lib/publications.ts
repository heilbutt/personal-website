import { getCollection } from 'astro:content';
const publicationsFromZotero = await getCollection('publicationsFromZotero');

import type { CollectionEntry } from 'astro:content';

// Zotero datatypes as defined using zod in content.config.ts
type PublicationFromZotero = CollectionEntry<'publicationsFromZotero'>;
type PublicationDataFromZotero = PublicationFromZotero['data'];
type PublicationTypeFromZotero = PublicationDataFromZotero['type'];
type AuthorFromZotero = PublicationDataFromZotero['author'][number];

// Narrows the union of Zotero data shapes down to the one matching `type`
type DataOfType<T extends PublicationTypeFromZotero> =
    Extract<PublicationDataFromZotero, { type: T }>;

// Format given name of the author to initials
function formatGivenName(givenName: string) {
    return givenName
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part[0] + '.')
        .join(' ');
}

// Format one author name
function formatOneAuthor(author: AuthorFromZotero) {
    const lastName = author['non-dropping-particle']
        ? author['non-dropping-particle'] + ' ' + author['family']
        : author['family'];
    return formatGivenName(author['given']) + ' ' + lastName;
}

// Format list of authors
function formatAuthors(authors: AuthorFromZotero[], maxAuthors = 3) {
    const shownAuthors = authors
        .slice(0, maxAuthors)
        .map(formatOneAuthor)
        .join(', ');
    return authors.length > maxAuthors
        ? shownAuthors + ' et al.'
        : shownAuthors;
}

// Get either DOI or URL from publication, if any
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

// Get the publication year as a string
function year(data: { issued: Date }) {
    return data.issued.getFullYear().toString();
}

// Type-safe narrowing predicate: keeps only publications of Zotero `type` T
function isType<T extends PublicationTypeFromZotero>(type: T) {
    return (pub: PublicationFromZotero): pub is PublicationFromZotero & { data: DataOfType<T> } =>
        pub.data['type'] === type;
}

// Simplified homogenous types for outputting HTML
// type export for the Astro page files
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

// Publication category: heading, URL slug, and the list of pubs
// type export for the Astro page files
export type PublicationCategory = {
    heading: string; // Headline to be printed
    slug: string // URL slug for anchor links
    publications: Publication[]; // list of pubs of this category
};

// Builds the homogenous Publication shape shared by all categories
function toPublication(pub: PublicationFromZotero, ...metaParts: (string | undefined)[]): Publication {
    return {
        title: pub.data['title'],
        authors: formatAuthors(pub.data['author']),
        meta: metaParts.filter(Boolean).join(', '),
        link: getPublicationLink(pub),
    };
}

// Declarative definition of one publication category: which Zotero `type`
// (and optionally `genre`, via `filter`) it draws from, and how to build
// its `meta` line. Add/change a category here, this owns presentation.
// content.config.ts still owns field validation.
function defineCategory<T extends PublicationTypeFromZotero>(config: {
    heading: string;
    slug: string;
    type: T;
    filter?: (data: DataOfType<T>) => boolean;
    meta: (data: DataOfType<T>) => (string | undefined)[];
}): PublicationCategory {
    const publications = publicationsFromZotero
        .filter(isType(config.type))
        .filter((pub) => !config.filter || config.filter(pub.data))
        .sort((a, b) => b.data.issued.getTime() - a.data.issued.getTime())
        .map((pub) => toPublication(pub, ...config.meta(pub.data)));
    return { heading: config.heading, slug: config.slug, publications };
}

// Defines the publication categories together with printed category title.
// The order of this array determines the order in the output HTML
export const publicationCategories: PublicationCategory[] = [
    defineCategory({
        heading: 'Articles in peer-reviewed journals',
        slug: 'journal-articles',
        type: 'article-journal',
        meta: (data) => [
            data['container-title'],
            data['volume'],
            data['issue'],
            year(data),
        ],
    }),
    defineCategory({
        heading: 'Articles in conference proceedings',
        slug: 'conference-articles',
        type: 'paper-conference',
        meta: (data) => [
            data['container-title'],
            data['event-place'],
            data['publisher'],
            year(data),
        ],
    }),
    defineCategory({
        heading: 'Theses',
        slug: 'theses',
        type: 'thesis',
        meta: (data) => [
            data['genre'],
            data['publisher'],
            data['publisher-place'],
            year(data),
        ],
    }),
    defineCategory({
        heading: 'Technical reports',
        slug: 'reports',
        type: 'report',
        meta: (data) => [
            data['publisher'],
            data['publisher-place'],
            data['number'],
            year(data),
        ],
    }),
    defineCategory({
        heading: 'Invited talks',
        slug: 'invited-talks',
        type: 'speech',
        filter: (data) => data['genre'] === 'Invited Talk',
        meta: (data) => [
            'Presentation given at the ' + data['event-title'],
            data['event-place'],
            year(data),
        ],
    }),
    defineCategory({
        heading: 'Talks',
        slug: 'talks',
        type: 'speech',
        filter: (data) => data['genre'] === 'Talk',
        meta: (data) => [
            'Presentation given at the ' + data['event-title'],
            data['event-place'],
            year(data),
        ],
    }),
    defineCategory({
        heading: 'Posters',
        slug: 'posters',
        type: 'speech',
        filter: (data) => data['genre'] === 'Poster',
        meta: (data) => [
            'Poster presented at the ' + data['event-title'],
            data['event-place'],
            year(data),
        ],
    }),
];
