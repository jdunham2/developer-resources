
/**
 * @param {object} props
 * @param {string} props.label
 * @param {string} props.holsterKey
 * @param {boolean} props.isLoading
 * @param {Array<{id: string, title: string, displayTitle?: string; }>} props.availableChoices
 * @param {(variant: { id: string; title: string; } | undefined | null) => void} props.onChange
 * @param {string} props.value
 * @param {string} props.subLabel
 * @param {boolean} props.canBeRemoved
 * @param {boolean} props.isMultiSelect
 * @param {boolean} props.hideLabel
 * @param {[]} props.productIds
 * @param {string} [props.video]
 * @param {boolean} [props.includeProductTitle]
 */
function PickerAsBlocks({ label, holsterKey, hideLabel, productIds, onChange, value, video, includeProductTitle = false, isMultiSelect = false, canBeRemoved = true, ...props }) {
  /** @type {HolsterContext} */
  const { updateHolster } = useContext(HolsterUpdateContext);

  function onVideoClicked() {
    const videoPlayer = html`
      <video
        controls
        autoplay
        style="max-width: 100%; max-height: 100%;"
        src=${video}
      >
      </video>
    `;
    updateHolster({ type: 'dialogMessage', value: videoPlayer })
  }

  const pickerAsBlocksContainer = css({
    label: 'picker-as-blocks-container',
    display: 'flex',
    flexWrap: 'nowrap',
    gap: '1rem',
    overflowX: 'auto',
    width: '100%',
    marginTop: '2rem',
  });

  const learnMoreVideoWrapper = css({
    fontSize: '1rem',
    color: 'gray',
    marginLeft: '1rem',
    pointerEvents: 'all',
    cursor: 'pointer',
    border: '1px solid',
    borderRadius: '20px',
    padding: '4px 1rem 4px 2rem',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    textDecoration: 'none',
  });

  // console.log('label', label, productIds)

  if (!productIds?.length) {
    return null;
  }

  return html`
    <div ...${props}>
      ${label && !hideLabel && html`
        <div class="form_item">
          <label class="form__label" style="pointer-events: none; display: flex;">
            ${label}${!canBeRemoved && html`<span style="font-size: 1.4rem; color: #a00;">*</span>`}
            ${video && html`
              <div className=${cx(learnMoreVideoWrapper)} onClick=${onVideoClicked}>
                Learn More
                <button type="button" style="color: currentColor; border-radius: 50%; width: 20px; height: 20px; background: transparent; border: 1px solid currentColor; display: inline-flex; align-items: center; justify-content: center;">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20" stroke="currentColor" style="width: 20px; height: 20px;">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3l14 9-14 9V3z" />
                  </svg>
                </button>
              </div>
            `}
          </label>
        </div>
      `}
      <div class=${pickerAsBlocksContainer}>
        ${productIds.map((product) => html`
          <${PickerBlocks} holsterKey=${holsterKey} parentLabel=${label} product=${product} onChange=${onChange} value=${value} includeProductTitle=${includeProductTitle} isMultiSelect=${false} canBeRemoved=${canBeRemoved} />
        `)}
      </div>
    </div>
  `;
}

/**
 * @param {object} props
 * @param {string} props.parentLabel
 * @param {object} props.product
 * @param {object} props.value
 * @param {function} props.onChange
 * @param {boolean} props.includeProductTitle
 * @param {boolean} props.isMultiSelect
 * @param {boolean} props.canBeRemoved
 * @param {string} props.holsterKey
 * @param {string} props.subLabel
 */
function PickerBlocks({ product: productId, value, onChange, includeProductTitle, canBeRemoved = true, parentLabel, holsterKey }) {
  /** @type { HolsterContext } */
  const { holster } = useContext(HolsterStateContext);
  /** @type {HolsterContext} */
  const { updateHolster } = useContext(HolsterUpdateContext);
  const domain = useBuilderDomain();
  const builderService = useBuilderService();

  // console.log('PickerBlocks', productId, value, holsterKey, includeProductTitle, canBeRemoved, parentLabel);

  const {
    data: product,
    isLoading: isLoadingProduct,
  } = builderService.useGetProduct(productId, {
    metafields: ['holster_material_blend_mode_options', 'builder_addons_images', 'hoster_material_image_overrides'],
    includeVariantImages: true,
    includeMetafieldImages: true,
  });

  const [imagesPreloaded, setImagesPreloaded] = useState(false);

  // console.log('holster?.selectedHolster?.variant', holster?.selectedHolster?.variant.title, product)
  const frontBackImageMetafield = domain.useAddonFrontBackImageMetafield(value, product, holster?.selectedHolster?.variant?.id);

  const frontAndBackImagesBeforeListLoaded = domain.useGetImageMetaObjectLinksForSelectedHolster({ frontBackImageMetafield, selectedHolsterId: holster?.selectedHolster?.variant?.id });

  const {
    data: frontImagesWithWashers,
    isLoading: isLoadingFrontImages,
  } = builderService.useGetMetaObjects(frontAndBackImagesBeforeListLoaded.front_images_with_washers, { includeMetafieldImages: true });
  // console.log('frontImagesWithWashers', frontImagesWithWashers)
  const {
    data: backImagesWithWashers,
    isLoading: isLoadingBackImages,
  } = builderService.useGetMetaObjects(frontAndBackImagesBeforeListLoaded.back_images_with_washers, { includeMetafieldImages: true });

  const frontAndBackImages = {
    front_image_no_washers: frontAndBackImagesBeforeListLoaded.front_image_no_washers,
    back_image_no_washers: frontAndBackImagesBeforeListLoaded.back_image_no_washers,
    frontImagesWithWashers,
    backImagesWithWashers,
  }

  function preloadFrontAndBackImages() {
    const images = [
      frontAndBackImagesBeforeListLoaded.front_image_no_washers,
      frontAndBackImagesBeforeListLoaded.back_image_no_washers,
      ...(frontImagesWithWashers?.flatMap((imagesMetaobject) => imagesMetaobject?.image) || []),
      ...(backImagesWithWashers?.flatMap((imagesMetaobject) => imagesMetaobject?.image) || []),
    ]
    images.forEach((imageUrl) => {
      preloadImage(sizedImageUrl(imageUrl, PATTERN_SIZE));
    })
  }


  function isAlreadySelected(variantId) {
    return holster[holsterKey]?.variant?.id === variantId;
  }

  function toggleVariant(variant) {
    if (isAlreadySelected(variant.id)) {
      if (canBeRemoved) {
        onChange(null, null);
      } else {
      }
    } else {
      onChange({ ...variant, title: variant.title == 'Default Title' ? product.title : variant.title }, frontAndBackImages);
    }
  }
  function handleVariantChange(variant) {
    onChange({ ...variant, title: variant.title == 'Default Title' ? product.title : variant.title }, frontAndBackImages);
  }

  useEffect(() => {
    let isMounted = true;
    if (!isMounted) return;

    if (isLoadingFrontImages || isLoadingBackImages || isLoadingProduct) {
      updateHolster({ type: 'isLoading', value: { ...holster.isLoading, 'PickerBlocks': true } });
    } else {
      if (!!value) return;
      if (!imagesPreloaded) {
        preloadFrontAndBackImages();
        setImagesPreloaded(true);
      }
      updateHolster({ type: 'isLoading', value: { ...holster.isLoading, 'PickerBlocks': false } });


      /** @type {object | undefined} */
      const choiceFromUrlParam = getChoiceFromUrlParam({ holsterKey, product })

      let el;
      if (choiceFromUrlParam) {
        console.log('setting product 1', product);
        handleVariantChange(choiceFromUrlParam);
        el = document.querySelector(`[data-variant-id="${choiceFromUrlParam.id}"]`);
      } else if (product?.variants?.length && !canBeRemoved) {
        console.log('setting product 2', product);
        handleVariantChange(product.variants[0]);
        el = document.querySelector(`[data-variant-id="${product.variants[0].id}"]`)
      } else {
        console.log('setting product 3 - should but doesnt', product, value);
      }

      // scroll the parent left or right to show the selected variant
      if (el) {
        // @ts-ignore
        el.parentElement.scrollLeft = el.offsetLeft - el.parentElement.offsetLeft - 100; // -100 shows a bit of the previous variant
      }
    }

    return () => {
      isMounted = false;
    }
  }, [isLoadingFrontImages, isLoadingBackImages, isLoadingProduct, imagesPreloaded, value]);

  const selectableVariant = css({
    label: 'selectable-variant',
    cursor: 'pointer',
    width: `${MATERIAL_THUMBNAIL_SIZE}px`,
    height: 'auto',
    aspectRatio: '1/1',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    border: '1px solid rgba(0,0,0,.1)',
    background: 'none',
    padding: 0,
    borderRadius: '8px',
    '&:hover': {
      background: 'rgba(0,0,0,.1)',
    },
    '& img': {
      borderTopLeftRadius: '8px',
      borderTopRightRadius: '8px',
    },
    '& input': {
      display: 'none',
    },
  });

  const selected = css({
    background: 'rgba(0,0,0,.08)',
    border: '1px solid rgba(0,0,0,.5)',
    '&:hover': {
      background: 'rgba(0,0,0,.06)',
    },
  });
  const productTitle = css({
    textTransform: 'uppercase',
    letterSpacing: '1.6px',
    fontSize: '10px',
  });
  const variantTitle = css({
    textTransform: 'uppercase',
    letterSpacing: '1.6px',
    fontSize: '10px',
  });
  const productCard = css({
    label: 'product-card',
    display: 'flex',
    flexDirection: 'column',
    width: `${MATERIAL_THUMBNAIL_SIZE - 2}px`,
    height: 'max-content',
    alignItems: 'center',
    '& img': {
      width: '100%',
    },
  });
  const productMeta = css({
    label: 'product-meta',
    display: 'flex',

    flexDirection: 'column',
    gap: '4px',
    padding: '8px 4px',
  });

  if (isLoadingFrontImages || isLoadingBackImages || isLoadingProduct) {
    return html`
      <div class=${cx(selectableVariant)}>
        <x-skeleton style="width: ${MATERIAL_THUMBNAIL_SIZE}px; height: ${MATERIAL_THUMBNAIL_SIZE}px; border-radius: 8px"></x-skeleton>
      </div>
    `;
  }

  if (!product.availableForSale) {
    return null;
  }

  return html`
    ${product?.variants?.map((variant) => html`
      ${variant.availableForSale && html`
        <label
        for=${variant.id}
        data-variant-id=${variant.id}
        class=${cx(selectableVariant, { [selected]: variant.id == value })}
        onMouseDown=${() => {
        toggleVariant(variant);
      }}
        onMouseEnter=${preloadFrontAndBackImages}
        title=${variant.title}>
          <input
            id=${variant.id}
            type="radio"
            name=${parentLabel}
            ${canBeRemoved ? 'required="true"' : ''}
            />
          <div class=${cx(productCard)} data-variant-id=${variant?.id}>
            <img width=${MATERIAL_THUMBNAIL_SIZE} height=${MATERIAL_THUMBNAIL_SIZE} loading="lazy"
            src=${sizedImageUrl(variant.image?.src, MATERIAL_THUMBNAIL_SIZE)}
            />
            <div class=${cx(productMeta)}>
              ${includeProductTitle && html`<span class=${cx(productTitle)}>${product.title.split('|').pop().trim()}</span>`}
              ${variant.title != 'Default Title' && html`<span class=${cx(variantTitle)}>${variant.title.split('|').pop().trim()}</span>`}
              ${variant.price ? html`<span>${floatToUsd(variant.price)}</span>` : null}
            </div>
          </div>
        </label>
      `}
    `)}
  `;
}
