// Type declarations for the PhotoSwipe caption plugin, which ships without them.
// Written from its README and source (v1.2.7).
// https://github.com/dimsemenov/photoswipe-dynamic-caption-plugin

declare module 'photoswipe-dynamic-caption-plugin' {
    import type PhotoSwipe from 'photoswipe';
    import type PhotoSwipeLightbox from 'photoswipe/lightbox';

    type Slide = NonNullable<PhotoSwipe['currSlide']>;

    export type DynamicCaptionOptions = {
        // CSS selector of the caption element inside each gallery item, or a
        // function returning the caption HTML. Default: '.pswp-caption-content'
        captionContent?: string | ((this: PhotoSwipeDynamicCaption, slide: Slide) => string);
        // Caption position. Default: 'auto'
        type?: 'auto' | 'below' | 'aside';
        // Window width in px below which the mobile layout is used, or a function
        // returning whether to use it (called without arguments). Default: 600
        mobileLayoutBreakpoint?: number | ((this: PhotoSwipeDynamicCaption) => boolean);
        // Caption closer to the edge than this (px) gets the class
        // pswp__dynamic-caption--on-hor-edge. Default: 20
        horizontalEdgeThreshold?: number;
        // Mobile: fraction of empty horizontal space above which the caption
        // overlaps the image instead of pushing it up. Default: 0.3
        mobileCaptionOverlapRatio?: number;
        // Always center the image vertically in the space left by the caption.
        // Default: false
        verticallyCenterImage?: boolean;
    };

    export default class PhotoSwipeDynamicCaption {
        constructor(lightbox: PhotoSwipeLightbox, options?: DynamicCaptionOptions);
    }
}
