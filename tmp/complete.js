import { h, render, createContext } from 'https://cdn.jsdelivr.net/npm/preact@10.18.1/+esm';
import { useEffect, useState, useContext, useCallback, useMemo, useRef, useReducer } from 'https://cdn.jsdelivr.net/npm/preact@10.18.1/hooks/+esm';
import htm from 'https://cdn.jsdelivr.net/npm/htm@3.1.1/+esm';
// https://emotion.sh/docs/@emotion/css#css
import { css, cx } from 'https://cdn.jsdelivr.net/npm/@emotion/css@11.11.2/+esm';
import humanize from 'https://cdn.jsdelivr.net/npm/humanize-graphql-response@1.0.0/+esm';
import { convertSchemaToHtml } from 'https://cdn.jsdelivr.net/npm/@thebeyondgroup/shopify-rich-text-renderer/+esm'

// Initialize htm with Preact
const html = htm.bind(h);
const API_VERSION = '2023-07';
const API_ACCESS_TOKEN = '3206cbd556b0baf5fc4ef5c6534602f0';

// if url contains ?type=mag then we will use the mag builder
// if url contains ?type=tray then we will use the tray builder
// if url contains ?type=wallet then we will use the wallet builder
// default to the holster
const BUILDER_TYPE = window.location.search.includes('type=mag')
  ? 'mag'
  : window.location.search.includes('type=tray')
    ? 'tray'
    : window.location.search.includes('type=wallet')
      ? 'wallet'
      : 'holster';

const URL_PARAMS = new URLSearchParams(window.location.search);

const DUMP_TRAY_GID = "gid://shopify/Product/{{ section.settings.dump_tray_product.id }}";
const WALLET_GID = "gid://shopify/Product/{{ section.settings.wallet_product.id }}";
const WING_REMOVAL_KIT_PRODUCT_ID = "gid://shopify/Product/{{ section.settings.wing_removal_product.id }}";
const IDENTICAL_MAG_POUCH_VARIANT_ID = "{{ section.settings.identical_pouch_product.variants[0].id }}";
const WING_REMOVAL_KIT_VARIANT_ID = "{{ section.settings.wing_removal_product.variants[0].id }}";

// if url contains ?debug=true, we will use the debug version of the app
const isDebug = window.location.search.includes('debug');

const isMobile = window.innerWidth < 750;
const DEBUG_MATERIAL_COLORS = isDebug;
const HOLSTER_GUN_MAKE_COLLECTION = 'builder-holster-gun-makes';
const PATTERN_SIZE = isMobile ? 500 : 1000;
const MATERIAL_THUMBNAIL_SIZE = isMobile ? 100 : 120;

/**
 * @typedef { '' | 'editingWashers' | 'editingBelt' | 'editingPattern' | 'editingPatternFront' | 'editingPatternBack' | 'editingBeltAttachment' | 'editingAddons' } EditAreas
*/
/**
 * @typedef { { frontImagesWithWashers: {washer_color: string;image: string}[]; backImagesWithWashers: {washer_color: string;image: string}[]; front_image_no_washers: string; back_image_no_washers: string; } } FrontBackImages
*/
/**
 * @typedef {object} PatternMeta
 * @property {string | undefined | null} [url]
 * @property {string | undefined | null} [innerUrl]
 * @property {string | undefined | null} [innerHex]
 * @property {boolean | undefined | null} [patternMaterialIsDark]
 * @property {boolean | undefined | null} [removeSoftLighting]
 * @property {number | undefined | null} [topPosition]
 * @property {number | undefined | null} [leftPosition]
 * @property {string | undefined | null} [messageWhenClicked]
*/
/**
 * @typedef {object} SkuBuilder
 * @property { 'IWB' | 'IWB Naked/Velcro' | 'OWB' | 'OWB Paddle' | 'Mag' | 'Dump Tray' | undefined } SkuBuilder.holster_type
 * @property { 'Left' | 'Right' | 'Right / Left | Naked / Velcro' | undefined} SkuBuilder.right_left_hand
 * @property { 'A' | 'B' | 'C' | 'D' | 'E' | undefined} SkuBuilder.kydex_size
 * @property { string | undefined} SkuBuilder.mold_number
 * @property { string | undefined} SkuBuilder.mount_plate
 * @property { string | undefined} SkuBuilder.cad_file
 * @property { 'Front' | 'Back' | undefined } SkuBuilder.front_back
 */
/**
 * @typedef { object } HolsterContext
 * @property { any } Provider
 * @property { HolsterContextUpdate } updateHolster
 * @property { HolsterContextState } holster
 * @typedef { object } HolsterContextState
 * @property { object | null } [selectedGunProduct]
 * @property { object | null } [selectedGunVariant]
 * @property { object | null } [selectedGunVariantBaseNoLight] // tmp value to store the base variant for the light
 * @property { 'Right' | 'Left' | null } [handChoice]
 * @property { boolean | null } [isLighted]
 * @property { 'IWB' | 'OWB' | null } [holsterStyle]
 * @property { string | number | null } [selectedHolsterProductId]
 * @property { { variant: object | null } | null } [selectedHolster]
 * @property { { variant: object | null } | null } [material]
 * @property { { variant: object | null } | null } [frontMaterial]
 * @property { { variant: object | null } | null } [backMaterial]
 * @property { { variant: object | null; frontBackImages: FrontBackImages | null } | null } [washer]
 * @property { { variant: object | null; frontBackImages: FrontBackImages | null } | null } [beltAttachment]
 * @property { { variant: object | null; frontBackImages: FrontBackImages | null } | null } [addon]
 * @property { { variant: object | null; frontBackImages: FrontBackImages | null } | null } [giftOption]
 * @property { PatternMeta | undefined | null } [frontPatternMeta]
 * @property { PatternMeta | undefined | null } [backPatternMeta]
 * // Upsell items
 * @property { { variant: object | null } | null } [wingRemovalKit]
 * @property { boolean | null } [addSecondMagPouchFor10]
 * @property { string[] | null } [specialInstructions]
 * @property { string | null } [giftWrapMessage]
 * // edit areas
 * @property { EditAreas } [userIsEditingSection] // classes to add to the canvas when the user is editing
 * // Notifications
 * @property { string[] | null } [notifications]
 * @property { Node | string | undefined | null } [dialogMessage]
  * @property { {[key: string]: boolean} } isLoading
 * // Sku Builder
 * @property { SkuBuilder[] | null } [allSkuMeta]
 */
/**
 * @typedef { keyof HolsterContext['holster'] } HolsterContextKey
 * @typedef { typeof holsterDispatchUpdateContext } HolsterContextUpdate
 */
/**
 * @template {keyof HolsterContext['holster']} T
 * @param {object} props
 * @param {T | 'resetHolsterOptions'} props.type
 * @param {HolsterContext['holster'][T]} props.value
 * @returns void
 */
function holsterDispatchUpdateContext({ type, value }) {
  // this is just a placeholder to create a type for holster.updateHolster
}
/** @type { HolsterContext } */
const Holster = createContext();
/** @type { HolsterContext } */
const HolsterStateContext = createContext();
/** @type { HolsterContext } */
const HolsterUpdateContext = createContext();

render(html`<${App} />`, document.getElementById('app-root'));


function App() {
  return html`
    <${GlobalStyles} />
    <${HolsterStateProvider}>
      <${MainBuilderWrapper} />
      <${Dialog} />
      <${LoadingIcon} />
    </${HolsterStateProvider}>
  `;
}

function Dialog() {
  /** @type {HolsterContext} */
  const { holster } = useContext(HolsterStateContext);
  /** @type {HolsterContext} */
  const { updateHolster } = useContext(HolsterUpdateContext);
  const ref = useRef();
  const contentRef = useRef();
  const dialog = css({
    label: 'dialog',
    width: '80vw',
    maxWidth: '800px',
    borderRadius: '16px',
    background: 'black',
    color: 'white',
  });
  const dialogInner = css({
    label: 'dialog-inner',
    justifyContent: 'center',
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
  });
  const dialogContent = css({
    label: 'dialog-content',
  });
  const closeBtn = css({
    label: 'button',
    background: 'transparent',
    border: '1px solid',
    padding: '1rem 2rem',
    color: 'white',
    cursor: 'pointer',
    marginLeft: 'auto',
  });
  useEffect(() => {
    if (holster.dialogMessage) {
      // @ts-ignore
      if (holster.dialogMessage.startsWith && holster.dialogMessage.startsWith('<')) {
        // this lets us use html in the dialog message
        // this is passed in from the metafields
        contentRef.current.innerHTML = holster.dialogMessage;
      }
      ref.current.showModal();
    }
  }, [holster.dialogMessage]);

  function onCloseDialog() {
    ref.current.close();
    updateHolster({ type: 'dialogMessage', value: null })
    contentRef.current.innerHTML = '';
  }

  return html`
    <dialog className=${cx(dialog)} ref=${ref}>
      <div className=${cx(dialogInner)}>
        <div ref=${contentRef} className=${cx(dialogContent)}>
          ${holster.dialogMessage}
        </div>
        <button onclick=${onCloseDialog} className=${cx(closeBtn)} type="button">Close</button>
      </div>
    </dialog>
  `;
}

function HolsterStateProvider(props) {
  // const builderService = useBuilderService();
  // const { data: shopName, isLoading } = builderService.useGetShopName();
  /** @type {HolsterContextState} */
  const holsterInitialState = {
    // required fields
    selectedGunProduct: null,
    selectedGunVariant: null,
    handChoice: null,
    isLighted: null,
    holsterStyle: null,
    selectedHolsterProductId: null,
    selectedHolster: null,
    // optional fields to set on load and reset if available
    material: null, // product id
    frontMaterial: null, // product id
    backMaterial: null, // product id
    washer: null,
    addon: null,
    beltAttachment: null,
    giftOption: null,
    // upsell items
    addSecondMagPouchFor10: false,
    specialInstructions: [],
    // notifications
    isLoading: {},
  };

  /** @type { HolsterContext['updateHolster'] } */
  const reducer = useCallback((state, action) => {
    // console.log('jeshua update holster precheck', action.type, action.value, 'prevValue', state[action.type])
    const urlValue = action.value?.variant?.id
      ? action.value.variant.id
      : action.value?.product?.id
        ? action.value.product.id
        : action.value?.id
          ? action.value.id
          : action.value;
    const urlTrackingBlacklist = [
      'useriseditingsection',
      'frontpatternmeta',
      'backpatternmeta',
      'isloading',
      'notifications',
      'dialogmessage',
      'allskumeta',
    ];
    // if (!urlTrackingBlacklist.includes(action.type.toLowerCase()) &&
    //   typeof urlValue == 'object') {
    //   console.error('trying to update holster with object', action.type, action.value)
    // }
    if (!urlTrackingBlacklist.includes(action.type.toLowerCase()) &&
      (typeof urlValue != 'object' || urlValue === null)) {
      updateUrlParams(action.type, urlValue);
    }
    // we do not change the state if its trying to set a value to undefined that shouldn't be
    // this happens when app first loads and values are not retrieved from the BE yet
    const hasProperty = action.value && typeof action.value == 'object' && Object.prototype.hasOwnProperty.call(action.value, 'variant');
    if (hasProperty && action.value?.variant === undefined) {
      return state;
    }
    if (action.type == 'resetHolsterOptions') {
      /** @type {Partial<HolsterContextState>} */
      const resetObject = {
        washer: null,
        beltAttachment: null,
        addon: null,
        material: null,
        frontMaterial: null,
        frontPatternMeta: null,
        backMaterial: null,
        backPatternMeta: null,
      }
      for (const key in resetObject) {
        updateUrlParams(key, null);
      }
      return {
        ...state,
        ...resetObject
      }
    }
    let isUnchanged = false;
    try {
      isUnchanged = JSON.stringify(state[action.type]) === JSON.stringify(action.value);
    } catch (e) {
      isUnchanged = state[action.type] == action.value;
    }
    if (isUnchanged) {
      return state;
    }
    // console.log('jeshua update holster', action.type, action.value, 'prevValue', state[action.type])
    return {
      ...state,
      [action.type]: action.value,
    }
  })
  const [state, dispatch] = useReducer(reducer, holsterInitialState)

  return html`
    <${HolsterStateContext.Provider} value=${({ holster: state })}>
      <${HolsterUpdateContext.Provider} value=${({ updateHolster: dispatch })}>
        ${props.children}
      </${HolsterUpdateContext.Provider}>
    </${HolsterStateContext.Provider}>
  `;
}

function MainBuilderWrapper(props) {
  const builderWrapper = css({
    fontSize: '100%',
    overflow: 'hidden',
    WebkitFontSmoothing: 'initial',
  });
  const configurationsContainer = css({
    // mm styles
    '--header-height': '84px',
    label: 'configurations-container',
    boxSizing: 'border-box',
    '& *': {
      boxSizing: 'border-box',
    },
    ':root': {
      '--right-side-content-width': '0',
    },
    '@media (min-width: 750px)': {
      '--right-side-content-width': '400px',
    },
    '@media (min-width: 1280px)': {
      '--right-side-content-width': '500px',
    },
    backgroundImage: 'linear-gradient(90deg, #181818 calc(100% - var(--right-side-content-width)), transparent calc(100% - var(--right-side-content-width))) !important',
    // end mm styles
    display: 'flex',
    flexFlow: 'column',
    width: '100vw',
    maxWidth: '100%',
    height: '100%',
    position: 'fixed',
    left: '0px',
    top: '0px',
  });

  const header = css({
    label: 'header',
    zIndex: '3',
    '@media (max-width: 750px)': {
      position: 'fixed',
      width: '100%',
      bottom: '0',
      left: '0',
    }
  });

  const leftSide = css({
    label: 'left-side',
    display: 'flex',
    flexFlow: 'column',
    WebkitBoxFlex: '1',
    flexGrow: '1',
    marginRight: 'var(--right-side-content-width)',
    position: 'relative',
    overflow: 'hidden',
    zIndex: '1',
    background: '#181818',
    '@media (max-width: 750px)': {
      height: '50svh',
    },
  });

  const rightSide = css({
    label: 'right-side',
    display: 'flex',
    width: 'var(--right-side-content-width)',
    flexFlow: 'column',
    position: 'absolute',
    right: '0px',
    bottom: '0px',
    top: '0px',
    padding: '0 20px',
    backgroundColor: 'rgb(255, 255, 255)',
    zIndex: '2',
    '@media (max-width: 750px)': {
      position: 'relative',
      width: 'auto',
      right: 'auto',
      bottom: 'auto',
      top: 'auto',
      overflow: 'scroll',
      borderTop: '5px solid orange',
      height: '50svh',
    },
  });

  return html`
    <div className=${cx(builderWrapper)} id="builder">
      <div className=${cx(configurationsContainer)}>
        <div className=${cx(header)}>
          <${Header} />
        </div>
        <div className=${cx(leftSide)}>
          <${LeftSide} />
        </div>
        <div className=${cx(rightSide)}>
          <${RightSide} />
        </div>
      </div>
    </div>
  `;
}

function Header(props) {
  /** @type { HolsterContext } */
  const { holster } = useContext(HolsterStateContext);
  const domain = useBuilderDomain();
  const totalPrice = domain.getTotalPrice(holster);

  function handleShare() {
    const shareData = {
      title: `Custom ${BUILDER_TYPE} from Eclipse Holsters`,
      text: `Check out this custom ${BUILDER_TYPE} I made from Eclipse Holsters!`,
      url: window.location.href + '&shared=true',
    };
    navigator.share(shareData)
      .then(() => console.log('Shared successfully'))
      .catch((error) => console.error('Error sharing', error));
  }

  const headerInner = css({
    label: 'header-inner',
    zIndex: '3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 2rem',
    backgroundColor: 'rgb(0,0,0)',
    '@media (max-width: 750px)': {
      height: '70px',
    }
  });
  const logo = css({
    label: 'logo',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '50px',
    '@media (max-width: 750px)': {
      height: '32px',
    }
  });
  const logoContainer = css({
    label: 'logo-container',

  });

  const rightSideHeader = css({
    label: 'right-side-header',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
    color: '#cdcdcd',
    '@media (max-width: 750px)': {
      justifyContent: 'space-between',
    },
  });
  const button = css({
    label: 'button',
    padding: '1rem 2rem',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    letterSpacing: '1.1px',
    textUnderlineOffset: '4px',
    border: 'none',
    cursor: 'pointer',
    textTransform: 'uppercase',
    display: 'flex',
    gap: '1rem',
  })
  const shareButton = css({
    label: 'save-button',
    background: 'none',
    color: '#cdcdcd',
    '&:hover': {
      color: '#fff',
    }
  })
  const price = css({
    label: 'price',
    fontSize: '2.5rem',
    marginRight: '2rem',
  });

  return html`
    <div className=${cx(headerInner)}>
      <a href="/" rel="noopener noreferrer">
        <div className=${cx(logo)}>
          <img src="{{ settings.logo | image_url: height: 100 }}" style="height: 90%;" />
        </div>
      </a>
      <div className=${cx(rightSideHeader)}>
        <div className=${cx("fancy-text", price)}>${floatToUsd(totalPrice)}</div>
        <button className=${cx(shareButton, button)} type="button" title="share" onclick=${handleShare}>
          <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path style="fill: currentColor;" d="M720-80q-50 0-85-35t-35-85q0-7 1-14.5t3-13.5L322-392q-17 15-38 23.5t-44 8.5q-50 0-85-35t-35-85q0-50 35-85t85-35q23 0 44 8.5t38 23.5l282-164q-2-6-3-13.5t-1-14.5q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35q-23 0-44-8.5T638-672L356-508q2 6 3 13.5t1 14.5q0 7-1 14.5t-3 13.5l282 164q17-15 38-23.5t44-8.5q50 0 85 35t35 85q0 50-35 85t-85 35Zm0-640q17 0 28.5-11.5T760-760q0-17-11.5-28.5T720-800q-17 0-28.5 11.5T680-760q0 17 11.5 28.5T720-720ZM240-440q17 0 28.5-11.5T280-480q0-17-11.5-28.5T240-520q-17 0-28.5 11.5T200-480q0 17 11.5 28.5T240-440Zm480 280q17 0 28.5-11.5T760-200q0-17-11.5-28.5T720-240q-17 0-28.5 11.5T680-200q0 17 11.5 28.5T720-160Zm0-600ZM240-480Zm480 280Z"/></svg>
        </button>
      </div>
    </div>
  `;
}

function LeftSide(props) {
  /** @type { HolsterContext } */
  const { holster } = useContext(HolsterStateContext);
  const [activeSide, setActiveSide] = useState('front');
  const toggleSide = useCallback(() => {
    setActiveSide((prevSide) => prevSide === 'front' ? 'back' : 'front');
  }, []);

  const leftSideInner = css({
    label: 'left-side-inner',
    position: 'absolute',
    inset: '0px'
  });

  const holsterCanvas = css({
    label: 'holster-canvas',
    position: 'absolute',
    transformOrigin: '50% 50%',
    transition: 'all 525ms ease-in-out 0s',
    left: '50%',
    top: '50%',
  });

  const foregroundHolster = css({
    label: 'foreground-holster',
    transform: 'translate(-50%, -50%)',
    zIndex: '2',
    pointerEvents: 'none', // allow clicks to pass though to back canvas

    // zoom effects while editing
    '&.editingWashers': {
      // transform: 'translate(-20%, -120%) scale(1.5)',
      transform: 'translate(-40%, -70%) scale(1.5)'
    },
    '&.editingBelt': {
      transform: 'translate(-20%, -120%) scale(1.5)'
    },
  });
  const backgroundHolster = css({
    label: 'background-holster',
    transform: 'translate(-90%, -80%) scale(0.4)',
    cursor: 'pointer',
    zIndex: 'unset',
  });

  const actions = css({
    label: 'actions',
    padding: '0px',
    margin: '0px',
    listStyle: 'none',
    display: 'flex',
    flexFlow: 'row',
    position: 'absolute',
    left: '50%',
    right: 'auto',
    bottom: '20px',
    transform: 'translateX(-50%)',
    zIndex: '3',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '2rem',
  });
  const flipButton = css({
    label: 'flip-button',
    position: 'relative',
    padding: '4px',
    // border: '1px solid rgb(234, 234, 234)',
    outline: '0px',
    font: 'inherit',
    whiteSpace: 'nowrap',
    color: 'inherit',
    backgroundColor: '#ddd',
    transform: activeSide === 'back' ? 'rotate(180deg) scaleX(-1)' : 'rotate(0deg) scaleX(1)',
    transition: 'all ease 0.3s',
    appearance: 'none',
    contain: 'none',
    cursor: 'pointer',
    overflow: 'visible',
    userSelect: 'none',
    WebkitTapHighlightColor: 'rgba(0, 0, 0, 0)',
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    '& img': {
      width: '100%',
    },
    '&:hover': {
      opacity: '0.8',
    },
    '@media (max-width: 750px)': {
      // you can click the canvas to toggle the side on mobile
      // display: 'none',
    },
    ...(BUILDER_TYPE === 'tray' && {
      display: 'none',
    }),
  });

  return html`
    <div className=${cx(leftSideInner)}>
      <div className=${cx(
    holsterCanvas,
    holster.userIsEditingSection,
    {
      [foregroundHolster]: activeSide === 'front',
      [backgroundHolster]: activeSide === 'back',
    }
  )} id="canvas-front">
        <${HolsterCanvas} side='front' onToggleSide=${toggleSide}/>
      </div>
      <div className=${cx(holsterCanvas,
    holster.userIsEditingSection,
    {
      [foregroundHolster]: activeSide === 'back',
      [backgroundHolster]: activeSide === 'front',
    }
  )} id="canvas-back">
        <${HolsterCanvas} side='back' onToggleSide=${toggleSide}/>
      </div>
      <ul className=${actions}>
        <li>
          <button class=${flipButton}
            aria-label="Rotate"
            type="button"
            onClick=${toggleSide}
            >
            <img src="https://cdn.shopify.com/s/files/1/0766/8829/4168/files/flip_icon_7457b0bb-4f8c-4f7f-b6bc-247c60fc21e5.png?v=1710339190" />
            <!-- <img src="https://cdn.shopify.com/s/files/1/0766/8829/4168/files/360_degrees_-_white_copy.png?v=1705562543" /> -->
          </button>
        </li>
        <li>
          <div style="color: white;">
            ${holster.notifications}
          </div>
        </li>
      </ul>
    </div>
  `;
}

function HolsterCanvas(props) {
  /** @type { HolsterContext } */
  const { holster } = useContext(HolsterStateContext);
  /** @type {HolsterContext} */
  const { updateHolster } = useContext(HolsterUpdateContext);
  const builderService = useBuilderService();
  const builderDomain = useBuilderDomain();
  const [highlightSection, setHighlightSection] = useState(null);

  const {
    data: product,
    isLoading: isLoadingProduct,
  } = builderService.useGetProduct(holster.selectedHolsterProductId, {
    metafields: ['holster_model_front_back_images'],
    includeMetafieldImages: true,
    includeProductMetafields: false,
  });

  useEffect(() => {
    if (isLoadingProduct) {
      updateHolster({ type: 'isLoading', value: { ...holster.isLoading, 'HolsterCanvas': true } });
    } else {
      updateHolster({ type: 'isLoading', value: { ...holster.isLoading, 'HolsterCanvas': false } });
    }
  }, [isLoadingProduct]);

  const {
    front,
    front_inner,
    back,
    back_inner,
  } = builderDomain.useHolsterModelFrontBackImagesMetafield(holster.selectedHolster?.variant?.id, product);

  const tmpWasherColor = holster.washer?.variant?.title;
  const washerOrAttachmentsImgUrls = useMemo(() => ([{
    type: 'washer',
    value: holster.washer
  },
  {
    type: 'addon',
    value: holster.addon,
  },
  {
    type: 'beltAttachment',
    value: holster.beltAttachment
  }].map((item) => {
    const currentWasherColor = !tmpWasherColor && item.type === 'washer' ? holster.washer?.variant?.title : tmpWasherColor;
    const { type, value } = item;
    if (!value || !value.variant || !value.frontBackImages) {
      return;
    }
    const { variant, frontBackImages } = value;
    const { frontImagesWithWashers, backImagesWithWashers, front_image_no_washers, back_image_no_washers } = frontBackImages;
    const imagesWithWashers = props.side === 'back' ? backImagesWithWashers : frontImagesWithWashers;
    const imageWithoutWashers = props.side === 'back' ? back_image_no_washers : front_image_no_washers;
    const selectWasherNotification = 'Select washer to see attachment.';

    // const findMatch = ({ imagesWithWashers, selectedWasherColor, defaultValue }) => {
    //   const match = imagesWithWashers?.find(metaObject => metaObject?.washer_color?.toLowerCase() === selectedWasherColor?.toLowerCase())
    //   return match?.image || defaultValue;
    // }

    if (!currentWasherColor && !imageWithoutWashers && !(BUILDER_TYPE == 'wallet')) {
      updateHolster({ type: 'notifications', value: [... new Set([selectWasherNotification, ...(holster.notifications || [])])] });
    } else {
      updateHolster({ type: 'notifications', value: holster.notifications?.filter((notification) => notification !== selectWasherNotification) });
    }
    // get the image for the current washer color
    // if there is no washer color or no match for the current washer color, use the image without washers
    const getImage = () => {
      const imageWithWasher = imagesWithWashers?.find((image) => {
        return image?.washer_color?.toLowerCase() == currentWasherColor?.toLowerCase();
      })?.image;
      if (imageWithWasher) {
        return sizedImageUrl(imageWithWasher, PATTERN_SIZE);
      }
      if (imageWithoutWashers) {
        return sizedImageUrl(imageWithoutWashers, PATTERN_SIZE);
      }
      return undefined;
    }
    return getImage();
  }).filter((image) => !!image)), [tmpWasherColor, holster.washer, holster.addon, holster.beltAttachment]);



  // const back = "https://i.ibb.co/CPSSg0T/HOLSTER-BASE-BACK.png";
  // const front = "https://i.ibb.co/pZvM5bC/HOLSTER-BASE.png";
  // const washerFrontBlue = "https://i.ibb.co/80WVqN9/LIGHT-BLUE-WASHERS.png";
  // const back = "https://i.ibb.co/CPSSg0T/HOLSTER-BASE-BACK.png";
  // const front = "https://i.ibb.co/pZvM5bC/HOLSTER-BASE.png";
  // const washerFrontBlue = "https://i.ibb.co/80WVqN9/LIGHT-BLUE-WASHERS.png";
  const isMollyB = holster.selectedHolster?.variant?.title?.toLowerCase().includes('molly');

  const holsterInsideImgUrl = sizedImageUrl(props.side === 'back' ? front_inner : back_inner, PATTERN_SIZE);
  const holsterOutsideImgUrl = sizedImageUrl(props.side === 'back' ? back : front, PATTERN_SIZE);
  const patternImgUrl = sizedImageUrl(
    props.side === 'back'
      ? holster.backPatternMeta?.url
      : holster.frontPatternMeta?.url,
    PATTERN_SIZE);
  // you see the inside of the front material on the back and the inside of the back material on the front
  // do not show the pattern on the back of the molly holster
  const innerImgUrl = props.side === 'back'
    ? !isMollyB ? holster.frontPatternMeta?.innerUrl : ''
    : holster.backPatternMeta?.innerUrl;
  const innerImgIsCustom = props.side === 'back'
    ? holster.frontPatternMeta?.innerUrl != holster.frontPatternMeta?.url || BUILDER_TYPE == 'tray'
    : holster.backPatternMeta?.innerUrl != holster.backPatternMeta?.url || BUILDER_TYPE == 'tray';
  // The inner pattern is either
  //  a solid color of the outer pattern (created by taking a 1px version of the pattern and stretching it to the size of the holster)
  //  or the custom inner pattern, in which case we use the full pattern at full size
  const innerPatternSize = innerImgIsCustom ? PATTERN_SIZE : 1;
  const innerPatternImgUrl = sizedImageUrl(innerImgUrl, innerPatternSize);

  // Mask Effects
  const removeSoftLighting = props.side === 'back' ? holster.backPatternMeta?.removeSoftLighting : holster.frontPatternMeta?.removeSoftLighting;
  const removeSoftLightingInner = props.side === 'back' ? holster.frontPatternMeta?.removeSoftLighting : holster.backPatternMeta?.removeSoftLighting;
  const patternMaterialIsDark = props.side === 'back' ? holster.backPatternMeta?.patternMaterialIsDark : holster.frontPatternMeta?.patternMaterialIsDark;
  const patternMaterialInnerIsDark = props.side === 'back' ? holster.frontPatternMeta?.patternMaterialIsDark : holster.backPatternMeta?.patternMaterialIsDark;
  const positionTop = props.side === 'back' ? holster.backPatternMeta?.topPosition : holster.frontPatternMeta?.topPosition;
  const positionLeft = props.side === 'back' ? holster.backPatternMeta?.leftPosition : holster.frontPatternMeta?.leftPosition;

  const canvasWrapper = css({
    label: 'canvas-wrapper',
    position: 'relative',
    width: '80svh',
    height: '80svh',
    overflow: 'hidden',
    transition: 'transform 525ms ease-in-out 0s',
    ...(holster.handChoice?.toLowerCase()?.includes('left') && {
      transform: 'scaleX(-1)',
    }),
    '@media (max-width: 750px)': {
      width: '40svh',
      height: '40svh',
    },
  });
  // this css should match in the pattern component also
  const imgWrapper = css({
    label: 'img-wrapper',
    width: '100%',
    height: '100%',
    position: 'absolute',
    '& img': {
      width: '100%',
    },
  });
  const washerStyle = css({
    label: 'washer',
  });
  const editingSection = css({
    maskImage: holster.userIsEditingSection == 'editingWashers'
      ? `url(${washerOrAttachmentsImgUrls[0]})`
      : '',
    // : holster.userIsEditingSection == 'editingPattern' || holster.userIsEditingSection == 'editingPatternFront' || holster.userIsEditingSection == 'editingPatternBack'
    //   ? `url(${holsterImgUrl})`
    // : `url(${holsterImgUrl})`,
    maskSize: '100%',
    // mixBlendMode: 'plus-lighter',
    transition: 'opacity .5s ease',
    opacity: '0',
  });

  useEffect(() => {
    let timeout;
    if (holster.userIsEditingSection) {
      setHighlightSection(true);
      timeout = setTimeout(() => {
        setHighlightSection(false);
      }, 3000);
    }
    return () => {
      setHighlightSection(false);
      clearTimeout(timeout);
    }
  }, [holster.userIsEditingSection])

  if (!holsterInsideImgUrl && !holsterOutsideImgUrl) {
    return null;
  }

  return html`
    <div className=${cx(canvasWrapper)} onclick=${props.onToggleSide}>
      <!-- holster -->
      ${[holsterInsideImgUrl, holsterOutsideImgUrl].map((holsterImgUrl, index) => {
    return (html`
          <div className=${cx(imgWrapper, 'holster')}>
            <img src=${holsterImgUrl} />
          </div>
          ${(patternMaterialIsDark && holsterImgUrl == holsterOutsideImgUrl)
      || (patternMaterialInnerIsDark && holsterImgUrl == holsterInsideImgUrl)
      || (BUILDER_TYPE == 'tray' && holsterImgUrl == holsterOutsideImgUrl)
      && html`
            ${['color-burn', 'multiply'].map((blendMode) => html`
              <div className=${cx(imgWrapper, blendMode, 'holster')}>
                <img src=${holsterImgUrl} />
              </div>
            `)}
          `}
        `)
  })}

      <!-- pattern -->
      ${[holsterInsideImgUrl, holsterOutsideImgUrl].map((holsterImgUrl, index) => html`
        <${HolsterPattern}
          patternMaterialIsDark=${holsterImgUrl == holsterOutsideImgUrl && patternMaterialIsDark
    || holsterImgUrl == holsterInsideImgUrl && patternMaterialInnerIsDark
    }
          removeSoftLighting=${holsterImgUrl == holsterOutsideImgUrl && removeSoftLighting
    || holsterImgUrl == holsterInsideImgUrl && removeSoftLightingInner
    }
          positionTop=${positionTop}
          positionLeft=${positionLeft}
          holsterImgUrl=${holsterImgUrl}
          patternImgUrl=${holsterImgUrl == holsterOutsideImgUrl ? patternImgUrl : innerPatternImgUrl}
          />
      `)}

      <!-- washers / addons -->
      ${washerOrAttachmentsImgUrls?.map((sizedImgUrl) => html`
        <div className=${cx(imgWrapper, washerStyle)}>
          <img src=${sizedImgUrl} />
        </div>
      `)}

      <div className=${cx(imgWrapper, editingSection, { ['fadeInOut']: highlightSection && holster.userIsEditingSection == 'editingWashers' })}>
        <img src='' style="background: rgb(255 215 0); width: 100%; height: 100%; opacity: .3;" />
      </div>
    </div>
  `;
}

function HolsterPattern({ holsterImgUrl, patternImgUrl, patternMaterialIsDark, removeSoftLighting, positionTop = 0, positionLeft = 0 }) {
  const patternStyles = css({
    label: 'pattern',
    '--mask-image-url': `url(${holsterImgUrl})`,
    WebkitMaskImage: 'var(--mask-image-url)',
    maskImage: 'var(--mask-image-url)',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    maskSize: '100%',
  });
  // this should match what is in the canvas wrapper css
  const imgWrapper = css({
    label: 'img-wrapper',
    width: '100%',
    height: '100%',
    position: 'absolute',
    '& img': {
      width: '100%',
    },
  });

  const innerPatternImage = css({
    label: 'inner-pattern-image',
    width: '100%', // should match the image attribute in imgWrapper
    position: 'relative',
    top: `${positionTop}%`, // lets us move the image around
    left: `${positionLeft}%`,
  });

  let patternBlendModes = [];
  if (patternMaterialIsDark) {
    patternBlendModes = ['hard-light'];
  }
  if (!patternMaterialIsDark) {
    patternBlendModes = ['color-burn'];
  }
  if (removeSoftLighting) {
    // we actually add the soft light mode to reduce the effect of the light
    patternBlendModes = [...patternBlendModes, 'soft-light'];
  }
  // it is important that color always comes last
  patternBlendModes = [...patternBlendModes, 'color'];


  return (html`
    ${patternBlendModes.map((blendMode) => {
    return html`
        <div className=${cx(blendMode, imgWrapper, patternStyles)}>
          <img className=${cx(innerPatternImage)} src=${patternImgUrl} />
        </div>
      `;
  })}
  `);
}

function RightSide(props) {
  const [activeTab, setActiveTab] = useState(1);
  const containerRef = useRef();
  const builderDomain = useBuilderDomain();
  /** @type { HolsterContext } */
  const { holster } = useContext(HolsterStateContext);
  /** @type {HolsterContext} */
  const { updateHolster } = useContext(HolsterUpdateContext);

  const rightSideInner = css({
    label: 'right-side-inner',
    overflow: 'auto',
    position: 'relative',
    paddingTop: 'var(--header-height)',
    '@media (max-width: 750px)': {
      paddingTop: '0',
      paddingBottom: '70px',
    },
  });

  function onTabChange(tab) {
    startViewTransition(() => {
      /** @type {HTMLFormElement} */
      const form = containerRef.current.querySelector('form');
      // @todo jeshua look more into the validity issue here
      if (form && !form.checkValidity()) {
        updateHolster({ type: 'dialogMessage', value: html`Select all required options before proceeding.` });
      } else {
        setActiveTab(tab);
        containerRef.current.scrollTo(0, 0);
      }
    });

    // this is temp, just to see if it works
    builderDomain.createBuilderSku(holster);
  }

  return html`
    <div className=${cx(rightSideInner)} ref=${containerRef}>
      <${Tabs} activeTab=${activeTab} />
      <${TabContent} activeTab=${activeTab} />
      <!--
        <${TabPagination} activeTab=${activeTab} onTabChange=${onTabChange} mobile/>
      -->
      <${TabPagination} activeTab=${activeTab} onTabChange=${onTabChange} />
    </div>
  `;
}

function Tabs({ activeTab }) {
  const container = css({
    label: 'tabs-container',
    display: 'grid',
    gap: '20px',
    gridAutoFlow: 'column',
    marginBottom: '2rem',
    '@media (max-width: 750px)': {
      display: 'none',
    },
  });
  const tab = css({
    textDecoration: 'none',
    pointerEvents: 'none',
    textTransform: 'uppercase',
    letterSpacing: '1.1px',
    textUnderlineOffset: '4px',
    fontSize: '38px',
    color: '#cdcdcd',
    background: 'none',
    border: 'none',
  });
  const active = css({
    display: 'block',
    textDecoration: 'underline',
    color: '#111'
  });

  return html`
    <div className=${cx(container)}>
      ${[1, 2, 3].map((tabNumber) => html`
        <div
          className=${cx('tab', tab, { [active]: activeTab === tabNumber })}>
          0${tabNumber}
        </div>
      `)}

    </div>
  `;
}

function TabContent({ activeTab }) {
  const tabContent = css({
    label: 'tab-content',
    overflow: 'auto',
  });

  return html`
    <div className=${cx(tabContent)}>
      <${Tab1} isActive=${activeTab === 1} />
      <${Tab2} isActive=${activeTab === 2} />
      <${Tab3} isActive=${activeTab === 3} />
    </div>
  `;
}

function TabPagination({ activeTab, onTabChange, mobile }) {
  const container = css({
    label: 'tab-pagination',
    display: mobile ? 'none' : 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: '2rem 2px',
    ...(mobile && {
      '@media (max-width: 750px)': {
        display: 'flex',
        position: 'absolute',
        top: 0,
        right: 0,
        margin: '12px 0',
      },
    })
  });
  const button = css({
    padding: '1rem 2rem',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    letterSpacing: '1.1px',
    textUnderlineOffset: '4px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textTransform: 'uppercase',
    display: 'flex',
    gap: '1rem',
    '&:disabled': {
      opacity: '0.3',
    },
    '&:hover': {
      color: '#111'
    },
    ...(mobile && {
      '@media (max-width: 750px)': {
        minWidth: 'unset',
        minHeight: 'unset',
        border: '2px solid',
        borderRadius: '50%',
        padding: 0,
        display: 'flex',
        gap: '20px',
        width: '20px',
        height: '20px',
        '&:first-of-type': {
          marginRight: '20px',
        },

        '& .text': {
          display: 'none',
        }
      },
    }),
  });

  return html`
  <div>
    <div className=${container}>
      <button
        type="button"
        className=${cx(button, 'button button--secondary')}
        onClick=${() => onTabChange(activeTab - 1)}
        disabled=${activeTab === 1}>
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4"><path d="M8.84182 3.13514C9.04327 3.32401 9.05348 3.64042 8.86462 3.84188L5.43521 7.49991L8.86462 11.1579C9.05348 11.3594 9.04327 11.6758 8.84182 11.8647C8.64036 12.0535 8.32394 12.0433 8.13508 11.8419L4.38508 7.84188C4.20477 7.64955 4.20477 7.35027 4.38508 7.15794L8.13508 3.15794C8.32394 2.95648 8.64036 2.94628 8.84182 3.13514Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"></path></svg>
        <span class="text">Prev Step</span>
      </button>
      <button
        type="button"
        className=${cx(button, 'button button--secondary')}
        onClick=${() => onTabChange(activeTab + 1)}
        disabled=${activeTab === 3}>
        <span class="text">Next Step</span>
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4"><path d="M6.1584 3.13508C6.35985 2.94621 6.67627 2.95642 6.86514 3.15788L10.6151 7.15788C10.7954 7.3502 10.7954 7.64949 10.6151 7.84182L6.86514 11.8418C6.67627 12.0433 6.35985 12.0535 6.1584 11.8646C5.95694 11.6757 5.94673 11.3593 6.1356 11.1579L9.565 7.49985L6.1356 3.84182C5.94673 3.64036 5.95694 3.32394 6.1584 3.13508Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"></path></svg>
      </button>
    </div>
    <div class="callout_icons" style="margin-top: 4rem; margin-bottom: 6rem; display: flex; justify-content: flex-end; gap: 1rem; opacity: 50%;">
      <img style="width: 32px;" src="//eclipseholsters.myshopify.com/cdn/shop/files/descriptionicon1.png?v=1709145395" alt="" />
      <img style="width: 32px;" src="//eclipseholsters.myshopify.com/cdn/shop/files/descriptionicon2.png?v=1709145408" alt="" />
    </div>
  </div>
  `;
}

function Tab1({ isActive }) {
  const tabQuestions = css({
    label: 'tab-questions',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
    marginBottom: '2rem',
    ...((BUILDER_TYPE === 'tray' || BUILDER_TYPE === 'wallet') && {
      display: 'none',
    }),
  });
  /** @type {HolsterContext} */
  const { holster } = useContext(HolsterStateContext);
  /** @type {HolsterContext} */
  const { updateHolster } = useContext(HolsterUpdateContext);
  const builderService = useBuilderService();
  const builderDomain = useBuilderDomain();

  const { data: collectionData, isLoading } = builderService.useGetCollectionData(HOLSTER_GUN_MAKE_COLLECTION);
  const {
    data: product,
    isLoading: isLoadingProduct,
  } = builderService.useGetProduct(holster.selectedGunProduct?.id, {
    metafields: [
      'holster_options_make_model',
      'builder_step_1_gun_mag_options',
      'sku_builder',
      'is_gun_light_for',
    ],
    includeProductMetafields: true,
    includeVariantMetafields: true,
  });

  const {
    dominant_hand_options,
    iwb_product_gid: iwb_holster_product_gid,
    owb_product_gid: owb_holster_product_gid,
    excludedVariants,
  } = builderDomain.useHolsterOptionsMakeModelMetafield(holster.selectedGunVariant?.id, product);
  const {
    iwb_mag_product_gid,
    owb_mag_product_gid,
  } = builderDomain.useMagOptionsMetafield(holster.selectedGunVariant?.id, product);

  let iwb_product_gid = iwb_holster_product_gid;
  let owb_product_gid = owb_holster_product_gid;
  if (BUILDER_TYPE === 'mag') {
    iwb_product_gid = iwb_mag_product_gid;
    owb_product_gid = owb_mag_product_gid;
  }
  if (BUILDER_TYPE === 'tray') {
    iwb_product_gid = DUMP_TRAY_GID;
    owb_product_gid = DUMP_TRAY_GID;
  }
  if (BUILDER_TYPE === 'wallet') {
    iwb_product_gid = WALLET_GID;
    owb_product_gid = WALLET_GID;
  }

  const {
    data: holsterProduct,
    isLoading: isLoadingHolsterProduct,
  } = builderService.useGetProduct(
    holster.selectedHolsterProductId,
    {
      metafields: ['holster_options_carry_styles']
    }
  );

  // useEffect(() => {
  //   if (isLoadingProduct || isLoadingHolsterProduct) {
  //     updateHolster({ type: 'isLoading', value: { ...holster.isLoading, 'tab1': true } });
  //   } else {
  //     updateHolster({ type: 'isLoading', value: { ...holster.isLoading, 'tab1': false } });
  //   }
  // }, [isLoadingProduct]);

  const availableHolsterOptions = builderDomain.useGetHolsterVariantList({ variants: holsterProduct?.variants, holsterContext: holster, excludedVariants });
  const availableGunModelOptions = builderDomain.useGetGunModelVariantList({ variants: product?.variants });
  const availableLightsForSelectedGunModel = builderDomain.useGetGunModelLightsForSelectedModel({ variants: product?.variants, selectedGunModelBaseVariant: holster.selectedGunVariantBaseNoLight });

  // select the first variant when the product changes
  useEffect(() => {
    const choiceFromURL = getChoiceFromUrlParam({ holsterKey: 'selectedHolster', availableChoices: availableHolsterOptions })
    updateHolster({
      type: 'selectedHolster', value: choiceFromURL || availableHolsterOptions && availableHolsterOptions[0] || null
    })
  }, [holsterProduct?.id, holster.isLighted])

  /**
   * @param {object} choice
   * @param {'IWB' | 'OWB' | null} choice.carryStyle
   */
  function onHolsterCarryStyleChange({ carryStyle }) {
    if (carryStyle === holster.holsterStyle) {
      return;
    }
    // if (
    //   !(isLoadingProduct || isLoadingHolsterProduct) && (
    //     carryStyle === 'IWB' && !iwb_product_gid
    //     || carryStyle === 'OWB' && !owb_product_gid
    //     || carryStyle === null
    //   )
    // ) {
    //   // This seems to be showing by error when selecting polymer 80... turning off for now
    //   // alert('Sorry, there are no options available for the selected gun model. Please select a different model.');
    //   return;
    // }

    const selectedHolsterProductId = carryStyle == 'IWB'
      ? iwb_product_gid
      : owb_product_gid;
    updateHolster({ type: 'holsterStyle', value: carryStyle });
    updateHolster({ type: 'selectedHolsterProductId', value: selectedHolsterProductId });
    // reset the holster options when the carry style changes
    updateHolster({ type: 'resetHolsterOptions', value: null });
  }

  /**
   * @param {object} selectedGunVariant
   * @param {boolean} isLightedSelector
   */
  function onGunModelChange(selectedGunVariant, isLightedSelector) {
    if (!isLightedSelector && selectedGunVariant?.id != holster.selectedGunVariantBaseNoLight?.id) {
      updateHolster({ type: 'selectedGunVariantBaseNoLight', value: selectedGunVariant });
    }
    // this condition seems redundant to the one above
    if (holster.isLighted && !isLightedSelector && selectedGunVariant?.id != holster.selectedGunVariantBaseNoLight?.id) {
      updateHolster({ type: 'selectedGunVariantBaseNoLight', value: selectedGunVariant });
      return;
    }
    updateHolster({ type: 'selectedGunVariant', value: selectedGunVariant });
    const allSkuMeta = builderDomain.getAllSkuMeta(selectedGunVariant);
    updateHolster({ type: 'allSkuMeta', value: allSkuMeta });
  }

  function onIsLightedChange(choice) {
    if (choice.id === 'true') {
      updateHolster({ type: 'isLighted', value: true });
    }
    if (choice.id === 'false') {
      updateHolster({ type: 'isLighted', value: false });
      updateHolster({ type: 'selectedGunVariant', value: holster.selectedGunVariantBaseNoLight });
    }
  }

  function getAvailableLightLaserChoices() {
    if (isLoadingProduct || isLoadingHolsterProduct) return [];
    return [{ id: 'false', title: 'No' }, ...availableLightsForSelectedGunModel?.length
      ? [{ id: 'true', title: 'Yes' }]
      : [{ id: 'not available', title: 'No Lighted Options Supported At This Time' }]
    ];
  }

  if (isLoading) {
    return html`
      <${Skeleton} isActive=${isActive}/>
    `;
  }

  return html`
    <${BuilderStepWrapper} step="1" isActive=${isActive}>
      <div class="step__heading fancy-text">GENERAL INFO</div>
      <${Select}
        label="Builder Type"
        availableChoices=${[
      { id: 'holster', title: 'Custom Holster' },
      { id: 'mag', title: 'Custom Mag' },
      { id: 'tray', title: 'Custom Dump Tray' },
      { id: 'wallet', title: 'Custom Wallet' },
    ]}
        onChange=${(item) => window.location.assign(`/pages/holster-builder?type=${item.id}`)}
        value=${BUILDER_TYPE}
        />
      <div className=${cx(tabQuestions)}>
        <${GunMakeSelector}
          availableChoices=${collectionData.collection.products}
          onChange=${(choice) => {
      updateHolster({ type: 'selectedGunProduct', value: choice });
    }}
          value=${holster.selectedGunProduct?.id}
          holsterKey="selectedGunProduct"
          />
        <${Select}
          label="Model"
          availableChoices=${availableGunModelOptions}
          onChange=${(choice) => {
      onGunModelChange(choice, false);
    }}
          value=${holster.selectedGunVariantBaseNoLight?.id}
          holsterKey="selectedGunVariantBaseNoLight"
          isLoading=${isLoadingProduct}
          />
        <${RadioPills}
          label="Carry Style"
          availableChoices=${[
      ...(!!iwb_product_gid ? [{ id: 'IWB', title: 'Inside the waistband (IWB)' }] : []), ...(!!owb_product_gid ? [{ id: 'OWB', title: 'Outside the waistband (OWB)' }] : [])]}
          onChange=${(/** @type { {id: "IWB" | "OWB" } | null} } */ choice) => {
      onHolsterCarryStyleChange({ carryStyle: (choice?.id || null) });
    }}
          value=${holster.holsterStyle}
          holsterKey="holsterStyle"
          isLoading=${isLoadingProduct}
          />
        <${Select}
          label="Carry Side"
          availableChoices=${dominant_hand_options && dominant_hand_options.map((handChoice) => ({ id: handChoice, title: handChoice }))}
          onChange=${(choice, options) => {
      updateHolster({ type: 'handChoice', value: choice.id });
    }}
          value=${holster.handChoice}
          holsterKey="handChoice"
          isLoading=${isLoadingProduct}
          />
        <${Select}
          label="Light/Laser Attachment"
          availableChoices=${getAvailableLightLaserChoices()}
          onChange=${(choice) => {
      onIsLightedChange(choice);
    }}
          value=${String(holster.isLighted)}
          holsterKey="isLighted"
          isLoading=${isLoadingProduct}
        />
        ${holster.isLighted && !!availableLightsForSelectedGunModel.length && html`
          <${Select}
            label="Light/Laser Model"
            availableChoices=${availableLightsForSelectedGunModel}
            onChange=${(choice) => {
        choice && onGunModelChange(choice, true);
      }
      }
            value=${holster.selectedGunVariant?.id}
            holsterKey="selectedGunVariant"
            isLoading=${isLoadingProduct}
          />
        `}
        </div>

    </${BuilderStepWrapper}>
  `;
}

function BuilderStepWrapper(props) {
  const styled = css({
    display: props.isActive ? 'flex' : 'none;',
    flexDirection: 'column',
    gap: '2rem',
    marginBottom: '2rem',
  });

  return html`
    <form className=${cx(styled, `step${props.step}`)} onSubmit=${() => false} data-step=${props.set} data-active=${props.isActive}>
      ${props.children}
    </form>
  `;
}

function Skeleton({ isActive }) {
  return html`
    <div style="display: grid; gap: 2rem; ${!isActive && 'display: none;'}">
      <x-skeleton class="form__label">General Info</x-skeleton>

      <div>
        <x-skeleton class="form__label">Gun Make</x-skeleton>
        <x-skeleton style="width: 100%" class="select__select">Options</x-skeleton>
      </div>

      <div>
        <x-skeleton class="form__label">Model</x-skeleton>
        <x-skeleton style="width: 100%" class="select__select">Options</x-skeleton>
      </div>

      <div>
        <x-skeleton class="form__label">Hand Choice</x-skeleton>
        <x-skeleton style="width: 100%" class="select__select">Options</x-skeleton>
      </div>

      <div>
        <x-skeleton class="form__label">Light/Laser Attachement</x-skeleton>
        <x-skeleton style="width: 100%" class="select__select">Options</x-skeleton>
      </div>

      <div>
        <x-skeleton class="form__label">Holster Style</x-skeleton>
        <div style="display: flex; gap: 1rem;">
          <x-skeleton style="width: 10%" >IWB</x-skeleton>
          <x-skeleton style="width: 10%">IWB</x-skeleton>
        </div>
      </div>
    </ >
    `;
}

function GunMakeSelector({ availableChoices, onChange, value, holsterKey }) {
  useEffect(() => {
    const hasPrevSelectedChoice = availableChoices?.find((choice) => choice.id === value);
    const choiceFromUrlParam = getChoiceFromUrlParam({ holsterKey, availableChoices });
    if ((!value && availableChoices?.length) || (availableChoices?.length && !hasPrevSelectedChoice)) {
      if (choiceFromUrlParam) {
        onChange(choiceFromUrlParam);
      } else {
        onChange(availableChoices[0]);
      }
    }
  }, [availableChoices]);

  return html`
    <div class="form_item">
        <label class="form__label" for="gun-make">
        Gun Make
        </label>
        <div class="select" style="display: flex; align-items: center;">
            <select id="gun-make" name="selectedGunProduct.id" class="select__select"
                ${
    // @todo
    //onclick="ehBuilder.preloadHolsterImages(); this.onclick = ''"
    ''
    }
                value=${value}
                onChange=${(e) => onChange(availableChoices.find(c => c.id === e.target.value))}>
                ${availableChoices && availableChoices.map((choice) => html`
                  <option value=${choice.id}>
                      ${choice.title.split('|').pop().trim()}
                  </option>
                `)}
            </select>
            <svg style="position: absolute; right: 1rem; cursor: pointer; pointer-events: none;" width="24" height="24" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 opacity-50" aria-hidden="true"><path d="M4.93179 5.43179C4.75605 5.60753 4.75605 5.89245 4.93179 6.06819C5.10753 6.24392 5.39245 6.24392 5.56819 6.06819L7.49999 4.13638L9.43179 6.06819C9.60753 6.24392 9.89245 6.24392 10.0682 6.06819C10.2439 5.89245 10.2439 5.60753 10.0682 5.43179L7.81819 3.18179C7.73379 3.0974 7.61933 3.04999 7.49999 3.04999C7.38064 3.04999 7.26618 3.0974 7.18179 3.18179L4.93179 5.43179ZM10.0682 9.56819C10.2439 9.39245 10.2439 9.10753 10.0682 8.93179C9.89245 8.75606 9.60753 8.75606 9.43179 8.93179L7.49999 10.8636L5.56819 8.93179C5.39245 8.75606 5.10753 8.75606 4.93179 8.93179C4.75605 9.10753 4.75605 9.39245 4.93179 9.56819L7.18179 11.8182C7.35753 11.9939 7.64245 11.9939 7.81819 11.8182L10.0682 9.56819Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"></path></svg>
        </div>
      </div>
    `;
}


/**
 * @param {object} props
 * @param {string} props.label
 * @param {string} props.holsterKey
 * @param {boolean} props.isLoading
 * @param {Array<{id: string, title: string, displayTitle?: string; availableForSale?: boolean; }>} props.availableChoices
 * @param {(variant: { id: string; title: string; } | undefined | null) => void} props.onChange
 * @param {string} props.value
 * @param {string} props.subLabel
 * @param {boolean} props.canBeRemoved
 */
function Select({ value, isLoading = false, availableChoices, onChange, label, holsterKey, subLabel, canBeRemoved = true }) {
  useEffect(() => {
    const hasPrevSelectedChoice = availableChoices?.find((variant) => variant?.id === value);
    const firstAvailableChoice = availableChoices?.find(choice => !choice.id.toLowerCase().includes('not available'));
    const choiceFromUrlParam = getChoiceFromUrlParam({ holsterKey, availableChoices });
    if ((!value || !hasPrevSelectedChoice) && availableChoices?.length && firstAvailableChoice) {
      if (choiceFromUrlParam) {
        onChange(choiceFromUrlParam);
      } else {
        onChange(firstAvailableChoice);
      }
    }
  }, [availableChoices]);

  const labelToId = getLabelToParam(label);

  return html`
    <div class="form_item">
        <label class="form__label" for=${labelToId}>
          ${label}${!canBeRemoved && html`<span style="font-size: 1.4rem; color: #a00;">*</span>`}
          ${subLabel && html`<small style='font-weight: 300'>${subLabel}</small>`}
        </label>
        <div class="select select-for-${label}" style="display: flex; align-items: center;">
          <select class=${cx('select__select', { ['hidden']: !isLoading })}><option>Loading...</option></select>
          <select
            id=${labelToId}
            class=${cx('select__select', { ['hidden']: isLoading })}
            value=${value}
            onChange=${(e) => { onChange(availableChoices.find(c => c.id === e.target.value)) }}>
          >
            ${availableChoices && availableChoices.map((choice) => html`
              ${choice?.availableForSale !== false && html`
                <option value=${choice?.id} disabled=${choice?.id.toLowerCase().includes('not available')}>
                  ${choice?.displayTitle ? choice?.displayTitle : choice?.title?.split('|').pop()}
                </option>
              `}
            `)}
          </select>
          <svg style="position: absolute; right: 1rem; cursor: pointer; pointer-events: none;" width="24" height="24" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 opacity-50" aria-hidden="true"><path d="M4.93179 5.43179C4.75605 5.60753 4.75605 5.89245 4.93179 6.06819C5.10753 6.24392 5.39245 6.24392 5.56819 6.06819L7.49999 4.13638L9.43179 6.06819C9.60753 6.24392 9.89245 6.24392 10.0682 6.06819C10.2439 5.89245 10.2439 5.60753 10.0682 5.43179L7.81819 3.18179C7.73379 3.0974 7.61933 3.04999 7.49999 3.04999C7.38064 3.04999 7.26618 3.0974 7.18179 3.18179L4.93179 5.43179ZM10.0682 9.56819C10.2439 9.39245 10.2439 9.10753 10.0682 8.93179C9.89245 8.75606 9.60753 8.75606 9.43179 8.93179L7.49999 10.8636L5.56819 8.93179C5.39245 8.75606 5.10753 8.75606 4.93179 8.93179C4.75605 9.10753 4.75605 9.39245 4.93179 9.56819L7.18179 11.8182C7.35753 11.9939 7.64245 11.9939 7.81819 11.8182L10.0682 9.56819Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"></path></svg>
        </div>
      </div>
    `;
}


function RadioPills({ value, isLoading, availableChoices, onChange, label, holsterKey }) {
  const choiceFromUrlParam = getChoiceFromUrlParam({ holsterKey, availableChoices });
  useEffect(() => {
    const hasPrevSelectedChoice = availableChoices?.find((variant) => variant?.id === value);
    if ((!value && availableChoices.length) || (availableChoices.length && !hasPrevSelectedChoice)) {
      if (choiceFromUrlParam) {
        onChange(choiceFromUrlParam);
      } else {
        onChange(availableChoices[0]);
      }
    }
    if (!isLoading && !availableChoices.length) {
      onChange(null);
    }
  }, [availableChoices]);

  const inputStyles = css({
    clip: 'rect(0,0,0,0)',
    overflow: 'hidden',
    position: 'absolute',
    height: '1px',
    width: '1px',
    clipPath: 'inset(50%)',
    whiteSpace: 'nowrap',
  });
  const labelStyles = css({
    border: 'var(--variant-pills-border-width) solid rgba(var(--color-foreground),var(--variant-pills-border-opacity))',
    backgroundColor: 'rgb(var(--color-background))',
    borderRadius: 'var(--variant-pills-radius)',
    color: 'rgb(var(--color-foreground))',
    display: 'inline-block',
    margin: '.7rem .5rem .2rem 0',
    padding: '1rem 2rem',
    opacity: '.7',
    fontSize: '1.4rem',
    letterSpacing: '.1rem',
    lineHeight: '1',
    textAlign: 'center',
    transition: 'border var(--duration-short) ease',
    cursor: 'pointer',
    position: 'relative'
  });
  const checkedLabel = css({
    backgroundColor: 'rgb(var(--color-foreground))',
    color: 'rgb(var(--color-background))',
    background: 'linear-gradient(114.81deg, #FC9401 23.6%, #FC1001 149.31%)',
    border: '1px solid orange !important',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  });

  return html`
    <div class="form_item">
      <label class="form__label">
        ${label}
      </label>
      <div>
        <div class=${cx({ ['hidden']: !isLoading })}>
          <div style="display: flex; gap: 1rem;">
            <x-skeleton style="width: 10%" >IWB</x-skeleton>
            <x-skeleton style="width: 10%">IWB</x-skeleton>
          </div>
        </div>
        <div class=${cx({ ['hidden']: isLoading })}>
          ${availableChoices && availableChoices.map((choice) => html`
            <input
              className=${inputStyles}
              type="radio"
              name="carryStyle"
              id="${choice.id}"
              value=${choice.id}
              checked=${value === choice.id}
              onClick=${() => onChange(choice)} />
            <label for="${choice.id}" className=${cx(labelStyles, { [checkedLabel]: value === choice.id })}>${choice.title}</label>
          `)}
          ${!availableChoices.length && html`<p>No options available</p>`}
        </div>
      </div>
    </div>
  `;
}

function Tab2({ isActive }) {
  const [materialTitle, setMaterialTitle] = useState(null);
  const [frontMaterialTitle, setFrontMaterialTitle] = useState(null);
  const [backMaterialTitle, setBackMaterialTitle] = useState(null);
  /** @type { HolsterContext } */
  const { holster } = useContext(HolsterStateContext);
  /** @type {HolsterContext} */
  const { updateHolster } = useContext(HolsterUpdateContext);
  const builderService = useBuilderService();
  const builderDomain = useBuilderDomain();
  const {
    data: gunModelProduct,
    isLoading: isLoadingGunModelProduct,
  } = builderService.useGetProduct(holster.selectedGunProduct?.id, {
    metafields: ['holster_options_make_model']
  });

  const {
    // iwb_product_gid,
    // owb_product_gid,
    excludedVariants,
  } = builderDomain.useHolsterOptionsMakeModelMetafield(holster.selectedGunVariant?.id, gunModelProduct);

  const {
    data: product,
    isLoading: isLoadingProduct,
  } = builderService.useGetProduct(
    holster.selectedHolsterProductId,
    {
      metafields: ['holster_options_carry_styles']
    }
  );

  // useEffect(() => {
  //   if (isLoadingGunModelProduct || isLoadingProduct) {
  //     updateHolster({ type: 'isLoading', value: { ...holster.isLoading, 'tab2': true } });
  //   } else {
  //     updateHolster({ type: 'isLoading', value: { ...holster.isLoading, 'tab2': false } });
  //   }
  // }, [isLoadingGunModelProduct, isLoadingProduct])

  const availableHolsterOptions = builderDomain.useGetHolsterVariantList({ variants: product?.variants, holsterContext: holster, excludedVariants, })

  const {
    materials_product_list,
    front_materials_product_list,
    back_materials_product_list,
    washers_product,
    add_ons_product_list,
    belt_attachments_product_list,
    addons_video,
    belt_attachments_video,
    belt_attachments_required,
  } = builderDomain.useHolsterOptionsCarryStylesMetafield(holster.selectedHolster?.variant?.id, product)

  const { data: beltAttachmentsVideo } = builderService.useGetVideo(belt_attachments_video);
  const { data: addonsVideo } = builderService.useGetVideo(addons_video);

  function resetSelectedName(key) {
    switch (key) {
      case 'material':
        setMaterialTitle(null);
        setFrontMaterialTitle(null);
        setBackMaterialTitle(null);
        break;
    }
  }

  function onHolsterVariantChange(variant) {
    updateHolster({ type: 'resetHolsterOptions', value: null });
    updateHolster({ type: 'selectedHolster', value: { variant } });
    resetSelectedName('material');
    updateHolster({ type: 'resetHolsterOptions', value: null });
  }

  function onMaterialPickerChange(variant, key) {
    setMaterialTitle(variant.title);
    updateHolster({ type: key, value: { variant } });
    console.log('jeshua variant', variant)
    const {
      the_pattern_is_very_dark,
      remove_soft_lighting
    } = builderDomain.useVariantPatternMetafield(variant)

    const {
      top_position,
      left_position,
      front_image_url,
      back_image_url,
      inner_image_url,
      message_when_clicked,
    } = builderDomain.useVariantPatternOverridesMetafield(variant)

    /**
     * @param {'front' | 'back'} type
     */
    function getPatternMeta(type) {
      function getImageUrls(type, front_image_url, back_image_url, inner_image_url, BUILDER_TYPE) {
        const url = type === 'front' ? front_image_url : back_image_url;
        let innerUrl;

        if (inner_image_url) {
          if (BUILDER_TYPE === 'tray') {
            innerUrl = type === 'front' ? back_image_url : front_image_url;
          } else {
            innerUrl = inner_image_url;
          }
        } else {
          if (type === 'front') {
            if (BUILDER_TYPE === 'tray') {
              innerUrl = back_image_url;
            } else {
              innerUrl = front_image_url;
            }
          } else {
            if (BUILDER_TYPE === 'tray') {
              innerUrl = front_image_url;
            } else {
              innerUrl = back_image_url;
            }
          }
        }

        return { url, innerUrl };
      }

      /** @type {PatternMeta} */
      const selectedPatternMeta = {
        url: getImageUrls(type, front_image_url, back_image_url, inner_image_url, BUILDER_TYPE).url,
        // the inner image can be a custom one or we match the backside of the type
        innerUrl: getImageUrls(type, front_image_url, back_image_url, inner_image_url, BUILDER_TYPE).innerUrl,
        patternMaterialIsDark: the_pattern_is_very_dark,
        removeSoftLighting: remove_soft_lighting,
        topPosition: top_position,
        leftPosition: left_position,
        messageWhenClicked: message_when_clicked,
      }
      return selectedPatternMeta;
    }

    const updateHolsterFront = () => {
      const patternMeta = getPatternMeta('front');
      startViewTransition(() => {
        updateHolster({ type: 'frontPatternMeta', value: patternMeta });
      })
    }

    const updateHolsterBack = () => {
      const patternMeta = getPatternMeta('back');
      startViewTransition(() => {
        updateHolster({ type: 'backPatternMeta', value: patternMeta });
      })
    }

    if (key === 'backMaterial') {
      updateHolsterBack();
    } else if (key === 'frontMaterial') {
      updateHolsterFront();
    } else if (key === 'material') {
      updateHolsterBack();
      updateHolsterFront();
    }
    if (message_when_clicked) {
      const message = convertSchemaToHtml(message_when_clicked);
      updateHolster({ type: 'dialogMessage', value: html`${message}` });
    }
  }

  /**
   * @param {object} props
   * @param {object} props.variant
   *  @param {HolsterContextKey} props.key
   * @param {string} props.type
   * @param {string[]} props.frontBackImages
   */
  function onAddonChange({ variant, frontBackImages, key, type }) {
    /** @type {object | null}  */
    let value = null
    if (variant) {
      value = { variant, frontBackImages, type };
    }

    if (type != 'washer') {
      startViewTransition(() => {
        updateHolster({ type: key, value });
      })
    } else {
      updateHolster({ type: key, value });
    }
  }

  if (isLoadingGunModelProduct || isLoadingProduct) {
    return html`
      <${BuilderStepWrapper} step="2" isActive=${isActive}>
        <${Skeleton} />
      </${BuilderStepWrapper}>
    `;
  }

  return html`
    <${BuilderStepWrapper} step="2" isActive=${isActive}>
      <div class="step__heading fancy-text">
        CUSTOMIZATIONS
      </div>
      ${DEBUG_MATERIAL_COLORS && (html`<${BlendModeTester} />`)}
      <${Select}
        label="Styles"
        availableChoices=${availableHolsterOptions}
        onChange=${(variant) => {
      onHolsterVariantChange(variant);
    }}
        value=${holster.selectedHolster?.variant?.id}
        holsterKey="selectedHolster"
        isLoading=${isLoadingGunModelProduct || isLoadingProduct}
        />
      <${MaterialPicker}
        label=${`Material`}
        canBeRemoved=${false}
        subLabel=${`${materialTitle ? `: (${materialTitle})` : ''}`}
        availableChoices=${materials_product_list}
        onChange=${(variant) => { onMaterialPickerChange(variant, 'material') }}
        value=${holster.material?.variant?.id}
        holsterKey="material"
        resetSelectedMaterialName=${() => resetSelectedName('material')}
        onMouseEnter=${() => updateHolster({ type: 'userIsEditingSection', value: 'editingPattern' })}
        onMouseLeave=${() => updateHolster({ type: 'userIsEditingSection', value: '' })}
        />
      <${MaterialPicker}
        label=${`Front Material`}
        canBeRemoved=${false}
        subLabel=${`${frontMaterialTitle ? `: (${frontMaterialTitle})` : ''}`}
        availableChoices=${front_materials_product_list}
        onChange=${(variant) => { onMaterialPickerChange(variant, 'frontMaterial') }}
        value=${holster.frontMaterial?.variant?.id}
        holsterKey="frontMaterial"
        resetSelectedMaterialName=${() => resetSelectedName('material')}
        onMouseEnter=${() => updateHolster({ type: 'userIsEditingSection', value: 'editingPatternFront' })}
        onMouseLeave=${() => updateHolster({ type: 'userIsEditingSection', value: '' })}
        />
      <${MaterialPicker}
        label=${`Back Material`}
        canBeRemoved=${false}
        subLabel=${`${backMaterialTitle ? `: (${backMaterialTitle})` : ''}`}
        availableChoices=${back_materials_product_list}
        onChange=${(variant) => { onMaterialPickerChange(variant, 'backMaterial') }}
        value=${holster.backMaterial?.variant?.id}
        holsterKey="backMaterial"
        resetSelectedMaterialName=${() => resetSelectedName('material')}
        onMouseEnter=${() => updateHolster({ type: 'userIsEditingSection', value: 'editingPatternBack' })}
        onMouseLeave=${() => updateHolster({ type: 'userIsEditingSection', value: '' })}
        />
      <${PickerAsBlocks}
        label=${holster.holsterStyle === 'IWB' || holster.selectedHolster?.variant?.title?.toLowerCase().includes('(paddle)')
      ? `Washers` : `Finishing Washers`}
        canBeRemoved=${false}
        productIds=${washers_product ? [washers_product] : []}
        onChange=${(variant, frontBackImages) => {
      onAddonChange({ variant, key: 'washer', frontBackImages, type: 'washer' });
    }}
        value=${holster.washer?.variant?.id}
        holsterKey="washer"
        onMouseEnter=${() => updateHolster({ type: 'userIsEditingSection', value: 'editingWashers' })}
        onMouseLeave=${() => updateHolster({ type: 'userIsEditingSection', value: '' })}
        />
      <${PickerAsBlocks}
        label=${`Belt Attachments`}
        canBeRemoved=${!belt_attachments_required}
        video=${!!beltAttachmentsVideo ? beltAttachmentsVideo : 'https://cdn.shopify.com/videos/c/vp/a0745076c8294cb8a25bfdd439a6d66f/a0745076c8294cb8a25bfdd439a6d66f.SD-480p-0.9Mbps.mp4'}
        productIds=${belt_attachments_product_list}
        isListOfVariants=${true}
        onChange=${(variant, frontBackImages) => {
      onAddonChange({ variant, key: 'beltAttachment', frontBackImages, type: 'addon' });
    }}
        value=${holster?.beltAttachment?.variant?.id}
        holsterKey="beltAttachment"
        includeProductTitle=${true}
        onMouseEnter=${() => updateHolster({ type: 'userIsEditingSection', value: 'editingBeltAttachment' })}
        onMouseLeave=${() => updateHolster({ type: 'userIsEditingSection', value: '' })}
        />
      <${PickerAsBlocks}
        label=${`Add Ons`}
        canBeRemoved=${true}
        video=${!!addonsVideo ? addonsVideo : 'https://cdn.shopify.com/videos/c/vp/a0745076c8294cb8a25bfdd439a6d66f/a0745076c8294cb8a25bfdd439a6d66f.SD-480p-0.9Mbps.mp4'}
        productIds=${add_ons_product_list}
        onChange=${(variant, frontBackImages) => {
      onAddonChange({ variant, key: 'addon', frontBackImages, type: 'addon' });
    }}
        value=${holster?.addon?.variant?.id}
        holsterKey="addon"
        includeProductTitle=${true}
        onMouseEnter=${() => updateHolster({ type: 'userIsEditingSection', value: 'editingAddons' })}
        onMouseLeave=${() => updateHolster({ type: 'userIsEditingSection', value: '' })}
        />
    </${BuilderStepWrapper}>
      `;
}

function BlendModeTester() {
  /** @type {HolsterContext} */
  const { holster } = useContext(HolsterStateContext);
  /** @type {HolsterContext} */
  const { updateHolster } = useContext(HolsterUpdateContext);
  const patternMaterialIsDark = holster.frontPatternMeta?.patternMaterialIsDark;
  const removeSoftLighting = holster.frontPatternMeta?.removeSoftLighting;
  const topPosition = holster.frontPatternMeta?.topPosition;
  const leftPosition = holster.frontPatternMeta?.leftPosition;


  return (html`
    <details style="margin-bottom: 3rem;">
      <summary class="button button--secondary" className=${css({
    border: '1px solid #999',
    borderRadius: '4px',
    color: '#333',
    width: 'max-content',
    padding: '1rem 2rem',
  })}>DEBUG - Blend Mode Effects</summary>
      <div class="test-display-options" style="background: lightgray; padding: 1rem 1rem 2rem; margin-bttom: 3rem;">
        <h2>DEBUG - Blend Mode Effects</h2>
        <p>Use this to test blend modes on the pattern image</p>
        <ol>
          <li>Select a Material</li>
          <li>Click a blend mode option</li>
          <li>Update the material variant Blend Options Metafield to use the desired effect</li>
          <li>Note: when a new material is selected these blend modes update to the current metafield state</li>
        </ol>
        <button type="button"
          onclick=${() => {
      /** @type {PatternMeta} */
      const frontPatternMeta = { ...holster.frontPatternMeta, patternMaterialIsDark: !patternMaterialIsDark };
      updateHolster({ type: 'frontPatternMeta', value: frontPatternMeta });
    }}>
          <span>${patternMaterialIsDark ? 'Disable' : 'Enable'}</span>
          "Dark Pattern Effect"
        </button>
        <button type="button"
          onclick=${() => {
      /** @type {PatternMeta} */
      const frontPatternMeta = { ...holster.frontPatternMeta, removeSoftLighting: !removeSoftLighting };
      updateHolster({ type: 'frontPatternMeta', value: frontPatternMeta });
    }}>
          <span>${removeSoftLighting ? 'Disable' : 'Enable'}</span>
          "Remove Soft Lighting Effect"
        </button>
        <input type="range" min="-50" max="50" value=${topPosition} onChange=${(e) => {
      /** @type {PatternMeta} */
      const frontPatternMeta = { ...holster.frontPatternMeta, topPosition: e.target.value };
      updateHolster({ type: 'frontPatternMeta', value: frontPatternMeta });
    }}/>
        <input type="range" min="-50" max="50" value=${leftPosition} onChange=${(e) => {
      /** @type {PatternMeta} */
      const frontPatternMeta = { ...holster.frontPatternMeta, leftPosition: e.target.value };
      updateHolster({ type: 'frontPatternMeta', value: frontPatternMeta });
    }
    }
          />

        <p>Current settings:</p>
        <ul style="margin-top: 2rem">
          <li>
            Dark Pattern Effect:
            <span style="margin-left: 1rem;" >${patternMaterialIsDark ? 'Enabled' : 'Disabled'}</span>
          </li>
          <li>
            Remove Soft Lighting Effect:
            <span style="margin-left: 1rem;">${removeSoftLighting ? 'Enabled' : 'Disabled'}</span>
          </li>
          <li>
            Top Position:
            <span style="margin-left: 1rem;">${topPosition}%</span>
          </li>
          <li>
            Left Position:
            <span style="margin-left: 1rem;">${leftPosition}%</span>
          </li>
        </ul>
      </div>
    </details>
  `)
}

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


/**
 * @param {object} props
 * @param {string} props.label
 * @param {string} props.subLabel
 * @param {string} props.value
 * @param {string} props.holsterKey
 * @param {string[]} props.availableChoices
 * @param {function} props.onChange
 * @param {function} props.resetSelectedMaterialName
 * @param {boolean} props.canBeRemoved
 */
function MaterialPicker({ availableChoices, onChange, label, subLabel, value, resetSelectedMaterialName, holsterKey, canBeRemoved = true, ...props }) {
  const [selectedMaterial, setSelectedMaterial] = useState(null);

  return (html`
    <div ...${props}>
      <${MaterialProductSelect}
        canBeRemoved=${canBeRemoved}
        label=${label}
        subLabel=${subLabel}
        availableChoices=${availableChoices}
        onChange=${(variant) => {
      setSelectedMaterial(variant);
      resetSelectedMaterialName();
    }}
        value=${selectedMaterial?.id}
        holsterKey=${holsterKey + '-parent'}
      />

      ${availableChoices?.map(materialProductId => html`
        ${selectedMaterial?.id === materialProductId && html`
          <${PickerAsBlocks}
            holsterKey=${holsterKey}
            label=${`${label}-child`}
            hideLabel=${true}
            productIds=${[materialProductId]}
            onChange=${(variant) => {
          onChange({ ...variant, title: `${variant.title} - ${selectedMaterial.title.split('|').pop().trim()}` });
        }}
            value=${value}
            holsterKey=${holsterKey}
            canBeRemoved=${canBeRemoved}
            />
        `}
      `)}
    </div>
  `)
}

function MaterialProductSelect({ availableChoices, onChange, label, holsterKey, subLabel, value, canBeRemoved = true }) {
  const builderService = useBuilderService();
  const { isLoading, data: products } = builderService.useGetProducts(availableChoices);

  if (!availableChoices?.length) {
    return null;
  }

  if (isLoading) {
    return html`
      <div>
        <x-skeleton class="form__label">Material</x-skeleton>
        <x-skeleton style="width: 100%" class="select__select">Options</x-skeleton>
      </div>
    `;
  }

  return html`
    <${Select}
      label=${label}
      canBeRemoved=${canBeRemoved}
      subLabel=${subLabel}
      availableChoices=${products}
      onChange=${onChange}
      value=${value}
      holsterKey=${holsterKey}
      isLoading=${isLoading}
    />
  `
}


function Tab3({ isActive }) {
  /** @type { HolsterContext } */
  const { holster } = useContext(HolsterStateContext);
  /** @type {HolsterContext} */
  const { updateHolster } = useContext(HolsterUpdateContext);
  const domain = useBuilderDomain();
  const builderService = useBuilderService();

  const {
    data: product,
  } = builderService.useGetProduct(
    holster.selectedHolsterProductId,
    {
      metafields: ['holster_options_carry_styles']
    }
  );

  const {
    gift_options_product_list,
  } = domain.useHolsterOptionsCarryStylesMetafield(holster.selectedHolster?.variant?.id, product)

  /**
   * @param {object} props
   * @param {object} props.variant
   *  @param {HolsterContextKey} props.key
   * @param {string} props.type
   * @param {string[]} props.frontBackImages
   */
  function onAddonChange({ variant, frontBackImages, key, type }) {
    /** @type {object | null}  */
    let value = null
    if (variant) {
      value = { variant, frontBackImages, type };
    }

    if (type != 'washer') {
      startViewTransition(() => {
        updateHolster({ type: key, value });
      })
    } else {
      updateHolster({ type: key, value });
    }
  }
  const onUpsellChange = (key, valueToToggle) => {
    if (typeof holster[key] === 'boolean') {
      updateHolster({ type: key, value: !holster[key] });
      return;
    }
    if (typeof holster[key] === 'object') {
      // is an array of strings in this case
      // so we need to remove or add the value
      if (holster[key].includes(valueToToggle)) {
        updateHolster({ type: key, value: holster[key].filter((value) => value !== valueToToggle) });
      } else {
        updateHolster({ type: key, value: [...holster[key], valueToToggle] });
      }
    }
  }

  /**
   * @param {HolsterContextState} holster
   */
  function onAddToCartClicked(holster) {
    updateHolster({ type: 'isLoading', value: { ...holster.isLoading, 'addToCart': true } });
    const contentForDialogAfterAdded = upsellContentOrAddToCartButton();
    const afterAddCallback = () => {
      updateHolster({ type: 'isLoading', value: { ...holster.isLoading, 'addToCart': false } });
      updateHolster({ type: 'dialogMessage', value: contentForDialogAfterAdded });
    }

    domain.onAddToCartClicked(holster, afterAddCallback);
  }

  function upsellContentOrAddToCartButton() {
    return html`
      <div style='margin-bottom: 2rem'>✅ Product Added</div>

      <div>ADD A CUSTOM</div>

      <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 4rem;">
        ${BUILDER_TYPE != 'holster' && html`
          <a href="/pages/holster-builder?type=hoslter" className=${cx(upsellButton)}>HOLSTER</a>
        `}
        ${BUILDER_TYPE != 'mag' && html`
          <a href="/pages/holster-builder?type=mag" className=${cx(upsellButton)}>MAG POUCH</a>
        `}
        ${BUILDER_TYPE != 'tray' && html`
          <a href="/pages/holster-builder?type=tray" className=${cx(upsellButton)}>DUMP TRAY</a>
        `}
        ${BUILDER_TYPE != 'wallet' && html`
          <a href="/pages/holster-builder?type=wallet" className=${cx(upsellButton)}>WALLET</a>
        `}
      </div>

      <a href="/cart" class="fancy-text">
        Go To Cart
      </a>
    `;
  }

  const button = css({
    label: 'button',
    padding: '1rem 2rem',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    letterSpacing: '1.1px',
    textUnderlineOffset: '4px',
    border: 'none',
    cursor: 'pointer',
    textTransform: 'uppercase',
    display: 'flex',
    gap: '1rem',
  })

  const upsellButton = css({
    borderRadius: '4px',
    padding: '1rem 2rem',
    color: 'white',
    border: '1px solid currentColor',
  })

  const atcButton = css({
    label: 'atc-button',
    background: 'linear-gradient(114.81deg, #fc9401 23.6%, #fc1001 149.31%)',
    color: 'white',
    borderRadius: '4px',
    '&:hover': {
      opacity: '0.8',
    }
  })

  const onPageAtcButton = css({
    padding: '2rem 3rem',
    marginTop: '2rem',
    width: '100%',
    justifyContent: 'center',
  })

  const rmrNotFlushSpecialInstructions = 'RMR not flush ($0)';
  const hasRaisedSights = 'Raised Sights ($0)';
  return html`
    <${BuilderStepWrapper} step="3" isActive=${isActive}>
    <!-- Something is wrong here and I have to have builder step 3 twice but it only shows once on FE -->
    <${BuilderStepWrapper} step="3" isActive=${isActive}>
      <div class="step__heading fancy-text">
        ADDITIONAL CUSTOMIZED ITEMS
      </div>

      <${PickerAsBlocks}
        label=${`Gift Wrapping`}
        canBeRemoved=${true}
        productIds=${gift_options_product_list}
        onChange=${(variant, frontBackImages) => { onAddonChange({ variant, key: 'giftOption', frontBackImages, type: 'gift' }) }}
        value=${holster?.giftOption?.variant?.id}
        holsterKey="giftOption"
        includeProductTitle=${true}
      />


      <div class="recommended-upsell-items" style="margin-bottom: 2rem;">
        ${holster.giftOption?.variant && html`
          <div><small>Gift Wrap Message</small></div>
          <label for="giftWrapMessage">
            <input id="giftWrapMessage"
              placeholder="Gift Message"
              style="width: calc(100% - 1rem);
                padding: 4px 8px;
                margin: 0 auto 2rem;"
              onChange=${(e) => updateHolster({ type: 'giftWrapMessage', value: e.target.value })} />
          </label>
        `}
        <div>
          ${BUILDER_TYPE == 'mag' && html`
            <label for="mag-pouch">
              <input id="mag-pouch" type="checkbox" checked=${holster.addSecondMagPouchFor10} onClick=${() => onUpsellChange('addSecondMagPouchFor10', holster.addSecondMagPouchFor10)} />
              Add an identical 2nd mag pouch for just $10! A ${floatToUsd(domain.getTotalPrice(holster) - (holster.addSecondMagPouchFor10 ? 10 : 0))} savings!
            </label>
          `}
        </div>
        <div>
          ${BUILDER_TYPE == 'holster' && html`
            ${holster.addon?.variant?.title?.toLowerCase().includes('wing') && html`
              <div><small>Recommended for your wing attachment</small></div>
              <${PickerAsBlocks}
                label=${`Recommended`}
                canBeRemoved=${true}
                productIds=${[WING_REMOVAL_KIT_PRODUCT_ID]}
                onChange=${(variant, frontBackImages) => { onAddonChange({ variant, key: 'wingRemovalKit', frontBackImages, type: 'wingRemovalKit' }) }}
                value=${holster?.wingRemovalKit?.variant?.id}
                holsterKey="wingRemovalKit"
                includeProductTitle=${true}
              />
            `}
            ${holster.isLighted && html`
              <!-- NEED TO SEND AS CART LINE ITEM PROPERTY -->
              <div style="margin-top: 1rem;"><small>Special Instructions</small></div>
              <div>
                <label for="not-flush-light">
                  <input id="not-flush-light" type="checkbox"
                    checked=${holster.specialInstructions?.includes(rmrNotFlushSpecialInstructions)}
                    onClick=${() => onUpsellChange('specialInstructions', rmrNotFlushSpecialInstructions)} />
                  RMR is not flush with the slide or is a Holosun
                </label>
              </div>
              <div>
                <label for="raised-sights">
                  <input id="raised-sights" type="checkbox"
                    checked=${holster.specialInstructions?.includes(hasRaisedSights)}
                    onClick=${() => onUpsellChange('specialInstructions', hasRaisedSights)} />
                  After-Market Raised Sights
                </label>
              </div>
            `}
          `}
        </div>
      </div>

      <button className=${cx(atcButton, button, onPageAtcButton)} onClick=${() => onAddToCartClicked(holster,)} type="button" id="atc_button">
        <span class="spinner">
          <span class="iconify" data-icon="akar-icons:loading" data-inline="false"></span>
        </span>
        ADD TO CART
      </button>
    <div>
  </${BuilderStepWrapper}>
  </${BuilderStepWrapper}>
  `;
}

function GlobalStyles() {
  return (html`
    <style>
      .step__heading, .form__label {
        font-size: 2.3rem;
      }
      .multiply {
        mix-blend-mode: multiply;
      }
      .overlay {
          mix-blend-mode: overlay;
      }
      .color-burn {
          mix-blend-mode: color-burn;
      }
      .hard-light {
          mix-blend-mode: hard-light;
      }
      .color {
          mix-blend-mode: color;
      }
      .soft-light {
          mix-blend-mode: soft-light;
      }
      .fadeInOut {
        animation: fadeInOut 1s ease-in-out;
        animation-iteration-count: 2;
      }
      @keyframes fadeInOut {
        0% {
          opacity: 0;
        }
        50% {
          opacity: 1;
        }
        100% {
          opacity: 0;
        }
      }
    </style>
  `)
}



/*******************************************************************************
 * Builder Domain
 *******************************************************************************/
function useBuilderDomain() {
  return ({
    ALL_DOMAIN_METAFIELDS: [
      'holster_options_make_model',
      'holster_options_carry_styles',
      'holster_material_blend_mode_options',
      'holster_model_front_back_images',
      'builder_step_1_gun_mag_options',
      'sku_builder',
      'is_gun_light_for',
      'builder_addons_images',
      // :( I misspelled holster but its too late to change... so many references are using it
      // thankfully its only internal
      'hoster_material_image_overrides',
    ],
    /**
     * Gets a list of variants based on the current sections and rules for the holster
     * For example, only shows the lighted variants if the holster is lighted
     *
     * @param {object} props
     * @param { any[] | undefined } props.variants
     * @param { HolsterContextState } props.holsterContext
     * @param { any[] } props.excludedVariants
     * @returns { any[] | undefined }
     */
    useGetHolsterVariantList: ({ variants, holsterContext, excludedVariants }) => {
      let variantList = variants ? [...variants] : [];
      if (holsterContext.isLighted) {
        variantList = variantList?.filter((variant) => variant.title.toLowerCase().includes('light'));
      }
      else {
        variantList = variantList?.filter((variant) => !variant.title.toLowerCase().includes('light'));
      }

      variantList = variantList?.filter((variant) => !excludedVariants.includes(variant.id));

      // add more rules here later
      return variantList;
    },

    /**
     * We need to creates 2 lists from the gun model variants since the lights are part of teh variants list
     *  1. gun models without light options
     *  2. gun models which are lighted options that match the base gun model selected in the first list
     *
     * Part 1 is done here
     * @param {object} props
     * @param { any[] | undefined } props.variants
     * @returns { any[] }
     */
    useGetGunModelVariantList: ({ variants }) => {
      const domain = useBuilderDomain();

      // get the list of gun models that are not lights - we know they are from the is_gun_light_for metafield
      let availableGunModelOptions = variants?.filter((variant) => {
        const { fits_gun_variants } = domain.getIsGunLightForMetafieldValue(variant);
        return !fits_gun_variants?.length;
      });

      return availableGunModelOptions || [];

    },

    /**
     * We need to creates 2 lists from the gun model variants since the lights are part of teh variants list
     *  1. gun models without light options
     *  2. gun models which are lighted options that match the base gun model selected in the first list
     *
     * Part 2 is done here
     * @param {object} props
     * @param { any[] | undefined } props.variants
     * @param { object } props.selectedGunModelBaseVariant
     * @returns { any[] }
     */
    useGetGunModelLightsForSelectedModel: ({ variants, selectedGunModelBaseVariant }) => {
      const domain = useBuilderDomain();

      // get the list of lights that are for the selected gun model
      let availableLightsForSelectedGunModel = variants?.filter((variant) => {
        const { fits_gun_variants } = domain.getIsGunLightForMetafieldValue(variant);
        // need to add a metaobject property for each lighted variant that references the non-lighted variants title
        return fits_gun_variants?.length && fits_gun_variants?.find(variantId => variantId == selectedGunModelBaseVariant?.id);
      });
      availableLightsForSelectedGunModel = availableLightsForSelectedGunModel?.map((variant) => {
        return {
          ...variant,
          displayTitle: variant.title.split('with').pop().trim(),
        };
      });

      return availableLightsForSelectedGunModel || [];
    },

    /**
     * Gets the is_gun_light metafield
     */
    getIsGunLightForMetafieldValue: (variant) => {
      /** @type { string[] | undefined } */
      const fits_gun_variants = variant.metafields?.find(metafield => metafield?.key === 'is_gun_light_for')?.value;
      return {
        fits_gun_variants: safeParse(fits_gun_variants),
      }
    },
    /**
     * Gets the holster_options_make_model metafield
     * Either uses the product metafield or the variant metafield.
     * Variant metafield takes precedence.
     */
    useHolsterOptionsMakeModelMetafield: (selectedVariantId, product) => {
      const selectedVariant = product?.variants?.find((variant) => variant.id === selectedVariantId);

      const metafieldsWithDefaultValues = {
        'custom.holster_options_make_model': {
          /** @type {any[]} */
          dominant_hand_options: [],
          /** @type {string | null } */
          iwb_product: null,
          /** @type {string | null } */
          owb_product: null,
          /** @type {boolean | null } */
          show_iwb_velcro_shows_unless_false: null,
          /** @type {string[]} */
          excluded_owb_variants: [],
          /** @type {string[]} */
          excluded_iwb_variants: [],
        }
      };

      /** @type { metafieldsWithDefaultValues } } */
      const metafieldValues = useBuilderDomain().extractMetafieldValues({
        product,
        variant: selectedVariant,
        metafieldsWithDefaultValues: metafieldsWithDefaultValues,
      });

      /** @param {metafieldsWithDefaultValues} metafieldValues */
      function getDominantHandOptions(metafieldValues) {
        const dominantHandOptions = metafieldValues['custom.holster_options_make_model'].dominant_hand_options || [];
        !dominantHandOptions.includes('Left Hand') && dominantHandOptions.push('Left Not Available');
        !dominantHandOptions.includes('Right Hand') && dominantHandOptions.push('Right Not Available');
        return dominantHandOptions;
      }

      return {
        ...metafieldValues['custom.holster_options_make_model'],
        dominant_hand_options: getDominantHandOptions(metafieldValues),
        iwb_product_gid: metafieldValues['custom.holster_options_make_model'].iwb_product, // the iwb_product and owb_product are renamed to have _gid at the end
        owb_product_gid: metafieldValues['custom.holster_options_make_model'].owb_product, // the iwb_product and owb_product are renamed to have _gid at the end
        excludedVariants: [...metafieldValues['custom.holster_options_make_model'].excluded_owb_variants, ...metafieldValues['custom.holster_options_make_model'].excluded_iwb_variants],
      }
    },

    /**
     * Gets the builder_step_1_gun_mag_options metafield
     */
    useMagOptionsMetafield: (selectedVariantId, product) => {
      const selectedVariant = product?.variants?.find((variant) => variant.id === selectedVariantId);

      const metafieldsWithDefaultValues = {
        builder_step_1_gun_mag_options: {
          /** @type {string | null} */
          iwb_product: null,
          /** @type {string | null} */
          owb_product: null,
        }
      };

      /** @type { metafieldsWithDefaultValues } } */
      const metafieldValues = useBuilderDomain().extractMetafieldValues({
        product,
        variant: selectedVariant,
        metafieldsWithDefaultValues
      });

      return {
        iwb_mag_product_gid: metafieldValues.builder_step_1_gun_mag_options.iwb_product, // the iwb_product and owb_product are renamed to have _gid at the end
        owb_mag_product_gid: metafieldValues.builder_step_1_gun_mag_options.owb_product, // the iwb_product and owb_product are renamed to have _gid at the end
      }
    },

    useHolsterOptionsCarryStylesMetafield: (selectedVariantId, product) => {
      const selectedVariant = product?.variants?.find((variant) => variant.id == selectedVariantId);

      const metafieldsWithDefaultValues = {
        holster_options_carry_styles: {
          /** @type {string[]} */
          materials_product_list: [],
          /** @type {string[]} */
          front_materials_product_list: [],
          /** @type {string[]} */
          back_materials_product_list: [],
          /** @type {string | null} */
          washers_product: null,
          /** @type {string[]} */
          add_ons_product_list: [],
          /** @type {string[]} */
          available_for_lighted_holsters: [],
          /** @type {string[]} */
          belt_attachments_product_list: [],
          /** @type {string[]} */
          gift_options_product_list: [],
          /** @type {string | null} */
          addons_video: null,
          /** @type {string | null} */
          belt_attachments_video: null,
          /** @type {boolean} */
          belt_attachments_required: false,
        }
      };

      /** @type { metafieldsWithDefaultValues } } */
      const metafieldValues = useBuilderDomain().extractMetafieldValues({
        product,
        variant: selectedVariant,
        metafieldsWithDefaultValues
      });

      return metafieldValues.holster_options_carry_styles;
    },

    useVariantPatternMetafield: (variant) => {
      const metafieldsWithDefaultValues = {
        holster_material_blend_mode_options: {
          the_pattern_is_very_dark: false,
          remove_soft_lighting: false,
        }
      };

      /** @type {metafieldsWithDefaultValues} */
      const metafieldValues = useBuilderDomain().extractMetafieldValues({
        product: undefined,
        variant,
        metafieldsWithDefaultValues,
      });

      return metafieldValues.holster_material_blend_mode_options;
    },

    useVariantPatternOverridesMetafield: (variant) => {
      const metafieldsWithDefaultValues = {
        hoster_material_image_overrides: {
          top_position: 0,
          left_position: 0,
          /** @type {string | null} */
          image: variant.image?.src,
          /** @type {string | null} */
          front_image: null,
          /** @type {string | null} */
          back_image: null,
          /** @type {string | null} */
          inner_image: null,
          /** @type {string | null} */
          message_when_clicked: null,
        }
      };

      /** @type { metafieldsWithDefaultValues } */
      const metafieldValues = useBuilderDomain().extractMetafieldValues({
        product: undefined,
        variant,
        metafieldsWithDefaultValues,
      });

      return {
        ...metafieldValues.hoster_material_image_overrides,
        image_url: metafieldValues.hoster_material_image_overrides.image,
        // if the front and back image urls are not set, use the image_url which defaults to the variant image
        front_image_url: metafieldValues.hoster_material_image_overrides.front_image || metafieldValues.hoster_material_image_overrides.image,
        back_image_url: metafieldValues.hoster_material_image_overrides.back_image || metafieldValues.hoster_material_image_overrides.image,
        inner_image_url: metafieldValues.hoster_material_image_overrides.inner_image,
      }
    },

    useHolsterModelFrontBackImagesMetafield: (selectedVariantId, product) => {
      const metafieldsWithDefaultValues = {
        holster_model_front_back_images: {
          base_1_front: '',
          base_1_front_inner: '',
          base_1_back: '',
          base_1_back_inner: '',
        }
      };

      let variant = product?.variants?.find((variant) => variant.id == selectedVariantId);
      if (!selectedVariantId) {
        variant = product?.variants[0];
      }

      /** @type { metafieldsWithDefaultValues } */
      const metafieldValues = useBuilderDomain().extractMetafieldValues({
        product: undefined,
        variant,
        metafieldsWithDefaultValues,
        isImageRef: true
      });

      const front = metafieldValues.holster_model_front_back_images.base_1_front;
      const back = metafieldValues.holster_model_front_back_images.base_1_back;
      const front_inner = metafieldValues.holster_model_front_back_images.base_1_front_inner;
      const back_inner = metafieldValues.holster_model_front_back_images.base_1_back_inner;

      return {
        front,
        back,
        front_inner,
        back_inner,
      }
    },

    useAddonFrontBackImageMetafield: (selectedVariantId, product, selectedHolsterId) => {
      const metafieldsWithDefaultValues = {
        builder_addons_images: [{
          holster_variant: '',
          front_image_no_washers: '',
          back_image_no_washers: '',
          front_images_with_washers: '',
          back_images_with_washers: '',
        }]
      };

      let variant = product?.variants?.find((variant) => variant.id == selectedVariantId);

      /** @type { metafieldsWithDefaultValues } */
      const metafieldValues = useBuilderDomain().extractMetafieldValues({
        product,
        variant,
        metafieldsWithDefaultValues,
        isImageRef: true
      });

      return metafieldValues.builder_addons_images;
    },

    useGetImageMetaObjectLinksForSelectedHolster: ({ frontBackImageMetafield, selectedHolsterId }) => {
      /** @type { { holster_variant: string, front_image_no_washers: string, back_image_no_washers: string, front_images_with_washers: string[], back_images_with_washers: string[]} } */
      const selectedAddonImageDetails =
        frontBackImageMetafield?.find(addonImageDetail => addonImageDetail?.holster_variant === selectedHolsterId)
        || frontBackImageMetafield[0];

      return selectedAddonImageDetails;
    },

    /**
   * @param {object} prop
   * @param {string} prop.front_image_no_washers
   * @param {string} prop.back_image_no_washers
   * @param {string} prop.selectedWasherColor
   * @param { { addon_name_washer_color: string; image: string; washer_color: string }[] } prop.frontImagesWithWashers
   * @param { { addon_name_washer_color: string; image: string; washer_color: string }[] } prop.backImagesWithWashers
   */
    getFrontBackImageUrlWithSelectedWasherColorImperative: ({
      front_image_no_washers,
      back_image_no_washers,
      frontImagesWithWashers,
      backImagesWithWashers,
      selectedWasherColor,
    }) => {
      /**
       * @param { object } props
       * @param { typeof frontImagesWithWashers } props.imagesWithWashers
       * @param { typeof selectedWasherColor } props.selectedWasherColor
       * @param { string } props.defaultValue
      */
      const findMatch = ({ imagesWithWashers, selectedWasherColor, defaultValue }) => {
        const match = imagesWithWashers?.find(metaObject => metaObject?.washer_color?.toLowerCase() === selectedWasherColor?.toLowerCase())
        return match?.image || defaultValue;
      }
      return ({
        frontImageUrl: findMatch({ imagesWithWashers: frontImagesWithWashers, selectedWasherColor, defaultValue: front_image_no_washers }),
        backImageUrl: findMatch({ imagesWithWashers: backImagesWithWashers, selectedWasherColor, defaultValue: back_image_no_washers }),
      })
    },

    getAllSkuMeta(gunModelVariant) {
      const domain = useBuilderDomain();
      // return gunModelVariant?.metafields?.find(metafield => metafield?.key === 'sku_builder')?.value;
      const metafieldsWithDefaultValues = {
        // We get a list of these back
        sku_builder: {
          /** @type { 'IWB' | 'IWB Naked/Velcro' | 'OWB' | 'OWB Paddle' | 'Mag' | 'Dump Tray' | undefined } */
          holster_type: undefined,
          /** @type {  Array<"Front" | "Back"> } */
          front_back: [],
          /** @type { 'Left' | 'Right' | 'Right / Left | Naked / Velcro' | undefined } */
          right_left_hand: undefined,
          /** @type { 'A' | 'B' | 'C' | 'D' | 'E' | undefined } */
          kydex_size: undefined,
          /** @type { string | undefined } */
          mold_number: undefined,
          /** @type { string | undefined } */
          mount_plate: undefined,
          /** @type { string | undefined } */
          cad_file: undefined,
        }
      };

      /** @type { metafieldsWithDefaultValues } */
      const metafieldValues = domain.extractMetafieldValues({
        product: undefined,
        variant: gunModelVariant,
        metafieldsWithDefaultValues,
      });

      const valueAsArray = []
      Object.keys(metafieldValues.sku_builder).forEach(key =>
        valueAsArray.push(metafieldValues.sku_builder[key]),
      );

      return valueAsArray;
    },

    /**
     * The return type is an object with all the keys sent in the metafields array
     * @template  metafieldsWithDefaultValues
     * @param { object } props
     * @param { object | undefined } props.product
     * @param { object } props.variant
     * @param { { [key: string]: { [key: string]: any } } } props.metafieldsWithDefaultValues
     * @param { boolean } [props.isImageRef]
     * @returns { { [P in keyof metafieldsWithDefaultValues]: any; } }
     */
    extractMetafieldValues: ({ product, variant, metafieldsWithDefaultValues, isImageRef = false }) => {
      const metafieldValues = {};
      const matchNamespaceAndKey = (metafield, key) => {
        {
          if (key.includes('.')) {
            return metafield?.key == key.split('.')[1] && metafield?.namespace == key.split('.')[0];
          }
          return metafield?.key == key && metafield?.namespace == 'custom'
        }
      }

      const getMetafieldBase = ({ product, variant, key }) => {
        if (variant?.metafields?.find(metafield => matchNamespaceAndKey(metafield, key))?.value) {
          return variant?.metafields?.find(metafield => matchNamespaceAndKey(metafield, key));
        }
        return product?.metafields?.find(metafield => matchNamespaceAndKey(metafield, key));
      }

      // const findMatchingMetafieldRef = ({ base, metafieldName }) => {
      //   return base?.reference?.fields?.find((field) => field.key === metafieldName)
      // }

      const isMetaObjectList = ({ base }) => {
        const isListOfMetaObjects = base?.value.startsWith("[\"gid://shopify/Metaobject/");
        return isListOfMetaObjects;
      }

      const humanizeMetaObjectWithDefaultValues = (base, key) => {
        // this lets us use the same function for both single metaobjects and lists of metaobjects
        if (metafieldsWithDefaultValues[key][0]) {
          if (base) {
            return ({
              ...(metafieldsWithDefaultValues[key][0]),
              ...(base && humanizeMetaObject(base)),
            })
          }
          return Array({
            ...(metafieldsWithDefaultValues[key][0]),
          });
        }

        return {
          ...(metafieldsWithDefaultValues[key]),
          ...(base && humanizeMetaObject(base)),
        }
      }

      Object.keys(metafieldsWithDefaultValues).map((key) => {
        if (!metafieldValues[key]) {
          metafieldValues[key] = {};
        }
        const base = getMetafieldBase({ product, variant, key });
        if (isMetaObjectList({ base })) {
          metafieldValues[key] = base?.references?.edges?.map(edge => humanizeMetaObjectWithDefaultValues(edge.node, key))
          return;
        }
        metafieldValues[key] = humanizeMetaObjectWithDefaultValues(base?.reference, key);
      });
      // @ts-ignore
      return metafieldValues;
    },

    /** humanizeProduct */
    humanizeProduct: (product) => {
      if (!product) {
        return product;
      }
      return {
        ...product,
        variants: product.variants?.map((variant) => {
          return {
            ...variant,
            // title: variant.title?.split('|').pop(),
            ...(variant.price?.amount && { price: Number(variant.price?.amount) }),
          }
        })
      }
    },

    // Checks if the list
    isLighted(variants) {
      return variants?.some((variant) => variant.title.toLowerCase().includes('light'));
    },

    /**
     * @param { HolsterContext['holster'] } holster
     * @returns number
     */
    getTotalPrice: (holster) => {
      return ([
        holster.selectedHolster?.variant?.price || 0,
        holster.selectedGunVariant?.price || 0,
        holster.material?.variant?.price || 0,
        holster.frontMaterial?.variant?.price || 0,
        holster.backMaterial?.variant?.price || 0,
        holster.washer?.variant?.price || 0,
        holster.beltAttachment?.variant?.price || 0,
        holster.addon?.variant?.price || 0,
        holster.giftOption?.variant?.price || 0,
        holster.wingRemovalKit?.variant?.price || 0,
        holster.addSecondMagPouchFor10 ? 10 : 0,
      ].reduce((a, b) => a + b, 0));
    },

    /**
     * @param { HolsterContext['holster'] } holster
     * @param {() => void | undefined } callbackAfterAdding
     */
    onAddToCartClicked: (holster, callbackAfterAdding = () => void 0) => {
      const domain = useBuilderDomain();
      const mainProduct = holster?.selectedHolster?.variant;
      const materialProduct = holster?.material?.variant;
      const frontMaterialProduct = holster?.frontMaterial?.variant;
      const backMaterialProduct = holster?.backMaterial?.variant;
      const washerProduct = holster?.washer?.variant;
      const beltAttachmentProduct = holster?.beltAttachment?.variant;
      const addonProduct = holster?.addon?.variant;
      const giftProduct = holster?.giftOption?.variant;
      const addSecondMagPouchFor10 = { id: holster?.addSecondMagPouchFor10 ? IDENTICAL_MAG_POUCH_VARIANT_ID : null };
      const wingRemovalKit = holster?.wingRemovalKit?.variant;
      const productsToAdd = [mainProduct, addonProduct, giftProduct, washerProduct, beltAttachmentProduct, materialProduct, frontMaterialProduct, backMaterialProduct, addSecondMagPouchFor10, wingRemovalKit].filter((variant) => !!variant?.id);

      if (!productsToAdd.length) {
        return;
      }

      function generateHolsterId(productsToAdd) {
        const holsterId = productsToAdd.map((product) => product.id).join('|||');
        return holsterId;
      }

      /**
       * @param { string } title
       * @param { number } [priceInCents] Prince in cents
       * @returns { string }
       */
      function titleWithPriceText(title, priceInCents) {
        return `${title.split('|').pop()}${!!priceInCents ? ` (${floatToUsd(priceInCents)})` : ''}`;
      }

      const formData = {
        items: productsToAdd.map(variant => ({
          'id': variant.id?.replace('gid://shopify/ProductVariant/', ''),
          'quantity': 1,
          'properties': {
            ...(variant.id === mainProduct.id ? ({
              '_builder_sku': domain.createBuilderSku(holster),
              '_custom-holster-id': generateHolsterId(productsToAdd),
              '_custom-holster-type': BUILDER_TYPE,
              '_rebuy-url': window.location.href,
              // round to 2 decimal places
              '_combined-price': domain.getTotalPrice(holster).toFixed(2),
              'Base': titleWithPriceText('', holster?.selectedHolster?.variant.price),
              ...(BUILDER_TYPE != 'tray' && BUILDER_TYPE != 'wallet' && ({
                'Gun Make': titleWithPriceText(holster?.selectedGunProduct?.title?.split('|').pop().trim(), 0),
                'Gun Model': titleWithPriceText(holster?.selectedGunVariant?.title, 0),
                'Carry Side': titleWithPriceText(String(holster?.handChoice), 0),
                'Lighted': titleWithPriceText(String(holster?.isLighted), 0),
                'Holster Model': titleWithPriceText(variant?.title, 0),
              })),
              ...(materialProduct?.id && ({
                'Material': titleWithPriceText(holster?.material?.variant?.title, holster?.material?.variant?.price),
              })),
              ...(frontMaterialProduct?.id && ({
                'Front Material': titleWithPriceText(holster?.frontMaterial?.variant?.title, holster?.frontMaterial?.variant?.price),
              })),
              ...(backMaterialProduct?.id && ({
                'Back Material': titleWithPriceText(holster?.backMaterial?.variant?.title, holster?.backMaterial?.variant?.price),
              })),
              ...(washerProduct?.id && ({
                'Washer Color': titleWithPriceText(holster?.washer?.variant?.title, holster?.washer?.variant?.price),
              })),
              ...(beltAttachmentProduct?.id && ({
                'Belt Attachment': titleWithPriceText(holster?.beltAttachment?.variant?.title, holster?.beltAttachment?.variant?.price),
              })),
              ...(addonProduct?.id && ({
                'Addon': titleWithPriceText(holster?.addon?.variant?.title, holster?.addon?.variant?.price),
              })),
              ...(wingRemovalKit?.id && ({
                'Addon': titleWithPriceText(holster.wingRemovalKit?.variant?.title, holster.wingRemovalKit?.variant?.price),
              })),
              ...(addSecondMagPouchFor10?.id && ({
                'Addon': titleWithPriceText("Identical Mag Pouch Sale", 1000),
              })),
              ...(giftProduct?.id && ({
                'Gift Option': titleWithPriceText(holster?.giftOption?.variant?.title, holster?.giftOption?.variant?.price),
                ...(holster.giftWrapMessage && ({
                  'Gift Wrap Message': holster.giftWrapMessage,
                }))
              })),
              ...(!!holster.specialInstructions?.length && ({
                'Special Instructions': holster.specialInstructions.join(',\n'),
              })),

            }) : ({
              '_custom-holster-parent-id': generateHolsterId(productsToAdd),
              '_referenced-as': variant.title,
            })),
          }
        })
        )
      };
      // console.log('jeshua formData 2', formData, productsToAdd, holster);

      fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
        .then(response => {
          console.log('response', response)
          return response.json();
        })
        .then((data) => {
          console.log('added to cart successfully', data);
          callbackAfterAdding?.();
        })
        .catch((error) => {
          alert('There was an error adding the product to the cart. Please try again.')
          console.error('Error:', error);
        });
    },

    /**
     * @param { HolsterContext['holster'] } holster
     * @param { HolsterContext['holster']['allSkuMeta'] } [allSkuMetaTmp]
     * @returns { string[] | undefined }
     */
    createBuilderSku: (holster, allSkuMetaTmp) => {
      // Sku Code [size Kydex - 3 sizes] - [Molds by number] - [plate holder] - [4 digit code for style]
      // Built from the following metafields
      // Front/Back for OWB styles
      // Model
      // Right/Left hand
      const domain = useBuilderDomain();
      const allSkuMeta = allSkuMetaTmp || holster.allSkuMeta;
      if (BUILDER_TYPE === 'tray') {
        // Lunar Dump Tray - Liner
        const liner_kydex_size = 'A';
        const liner_mold_number = 'None';
        const liner_mount_plate = '8';
        const liner_cad_file = 'LINER';
        // Lunar Dump Tray - Outer
        const outer_kydex_size = 'C';
        const outer_mold_number = '701';
        const outer_mount_plate = '7';
        const outer_cad_file = 'BODY';
        const customSkusForShop = [`${liner_kydex_size}-${liner_mold_number}-${liner_mount_plate}-${liner_cad_file}`, `${outer_kydex_size}-${outer_mold_number}-${outer_mount_plate}-${outer_cad_file}`];
        console.log('customSkusForShop', customSkusForShop)
        return customSkusForShop;
      }
      if (BUILDER_TYPE === 'wallet') {
        // Apollo 12 Wallet
        const kydex_size = 'A';
        const mold_number = '704'
        const mount_plate = 'Hand Router'
        const cad_file = 'Hand Router'
        const customSkusForShop = [`${kydex_size}-${mold_number}-${mount_plate}-${cad_file}`];
        console.log('customSkusForShop', customSkusForShop)
        return customSkusForShop;
      }

      if (!allSkuMeta?.length) return;
      const skusData = domain.getMatchingSkus(allSkuMeta, holster)
      const customSkusForShop = skusData.map(requiredSku => {
        return `${requiredSku.kydex_size}-${requiredSku.mold_number}-${requiredSku.mount_plate}-${requiredSku.cad_file}`;
      });
      console.log('customSkusForShop', customSkusForShop)
      return customSkusForShop;

    },
    /**
     * @param { SkuBuilder[] } allSkuMeta
     * @param { HolsterContext['holster'] } holster
     * @returns { SkuBuilder[] }
     */
    getMatchingSkus: (allSkuMeta, holster) => {
      let possibleSkus = allSkuMeta;
      possibleSkus = filterByHolsterType(possibleSkus);
      possibleSkus = filterByHandChoice(possibleSkus);

      /** @param { SkuBuilder[] } possibleSkus */
      function filterByHolsterType(possibleSkus) {
        /** @TODO jeshua debug this url, its saying there is no sku meta */
        // http://127.0.0.1:9292/pages/holster-builder?type=holster&selectedgunproduct=gid%3A%2F%2Fshopify%2FProduct%2F8397379895529&selectedgunvariantbasenolight=gid%3A%2F%2Fshopify%2FProductVariant%2F46789565186281&selectedgunvariant=gid%3A%2F%2Fshopify%2FProductVariant%2F46789565186281&holsterstyle=IWB&selectedholsterproductid=gid%3A%2F%2Fshopify%2FProduct%2F8397377863913&handchoice=Right+Hand&islighted=false&debug=&debug=&giftwrapmessage=thank+you&selectedholster=gid%3A%2F%2Fshopify%2FProductVariant%2F46789553881321&material=gid%3A%2F%2Fshopify%2FProductVariant%2F46789548474601&washer=gid%3A%2F%2Fshopify%2FProductVariant%2F43591015497961&beltattachment=gid%3A%2F%2Fshopify%2FProductVariant%2F46789555060969&addon=gid%3A%2F%2Fshopify%2FProductVariant%2F46789555290345
        console.log('possible skus', possibleSkus)
        const isOWBPaddle = !!holster?.selectedHolster?.variant?.title?.toLowerCase()?.includes('(paddle)');
        let filteredSkus = possibleSkus.filter((skuMeta) => {
          const { holster_type } = skuMeta;
          if (!holster?.holsterStyle) return false;
          if (isOWBPaddle) {
            return holster_type?.toLowerCase().includes('owb paddle');
          }
          // don't include owb paddle in owb results
          return holster_type?.toLowerCase().includes(holster.holsterStyle.toLowerCase()) &&
            !holster_type?.toLowerCase().includes('owb paddle');
        });

        if (!filteredSkus.length && isOWBPaddle) {
          filteredSkus = possibleSkus.filter((skuMeta) => {
            const { holster_type } = skuMeta;
            return holster_type?.toLowerCase().includes('iwb');
          });
        }
        return filteredSkus;
      }

      /** @param { SkuBuilder[] } possibleSkus */
      function filterByHandChoice(possibleSkus) {
        return possibleSkus.filter((skuMeta) => {
          const { right_left_hand } = skuMeta;
          if (!right_left_hand) return false;
          return holster.handChoice?.toLowerCase().includes(right_left_hand.toLowerCase());
        });
      }

      return possibleSkus;
    },
  })
}

/*******************************************************************************
 * Builder Service
 *******************************************************************************/
function useBuilderService() {
  return ({
    useGetCollectionData: (collectionHandle) => {
      return useQuery(['collections'], `
        collection(handle: "${collectionHandle}") {
          title
          products(first: 100) {
            edges {
              node {
                title
                id
              }
            }
          }
        }`
      );
    },

    useGetProducts: (productIds) => {
      // Careful where this is used. Caused bugs in the past.
      const { useGetProduct } = useBuilderService();
      const results = productIds.map((productId) => {
        return useGetProduct(productId, {})
      });

      const isLoading = results.some((result) => result.isLoading);
      const data = results.map((result) => result.data).filter(data => {
        return data?.availableForSale
      });
      return {
        isLoading,
        data: data,
      }
    },

    /**
     * @typedef {object} useGetProductOptions
     * @property { string[] } [productFields] default [] - fields to include on the product query
     * @property { string[] } [variantFields] default ['id', 'title'] - fields to include on the variant query
     * @property { string[] } [metafields]
     * @property { boolean } [includeProductMetafields] default true
     * @property { boolean } [includeProductImages] default false
     * @property { boolean } [includeVariants] default true
     * @property { boolean } [includeVariantMetafields] default true
     * @property { boolean } [includeVariantImages] default false
     * @property { boolean } [includeMetafieldImages] default false
     * @property { boolean } [isProductHandle] default false - if true, will use the product handle instead of the product id
     */
    /**
     * @param { number | string | undefined | null } [productId]
     * @param { useGetProductOptions } [options]
     */
    useGetProduct: (productId, options) => {
      console.log('productId', productId)
      const domain = useBuilderDomain();
      /** @type {useGetProductOptions} */
      const defaultOptions = {
        productFields: ['id', 'title', 'availableForSale'],
        variantFields: ['id', 'title', 'price', 'availableForSale'],
        metafields: [],
        includeProductMetafields: true,
        includeVariantMetafields: true,
        includeVariants: true,
        includeProductImages: false,
        includeVariantImages: false,
        includeMetafieldImages: false,
        isProductHandle: false,
      }

      const queryOptions = {
        ...parsedOptions(defaultOptions),
        ...parsedOptions(options),
      }

      function parsedOptions(options) {
        ['productFields', 'variantFields'].map(field => {
          if (options[field]?.includes('price')) {
            options[field] = options[field].filter((field) => field !== 'price');
            options[field].push(`price {
              amount
              currencyCode
            }`);
          }
          if (options[field]?.includes('compareAtPrice')) {
            options[field] = options[field].filter((field) => field !== 'compareAtPrice');
            options[field].push(`compareAtPrice {
              amount
              currencyCode
            }`);
          }

        });

        return options;
      }

      const subQueryKey = JSON.stringify(queryOptions)

      const subMetaObjectQuery = (`
          ... on Metaobject {
            fields {
              key
              type
              value
              ${queryOptions?.includeMetafieldImages ? (`
                reference {
                    ...on MediaImage {
                      image {
                        originalSrc
                      }
                    }
                }
              `) : ''}
            }
          }
      `);

      const metaObjectQuery = (identifiers) => (`
        metafields(identifiers: [${identifiers.map(({ key, namespace }) => `{key: "${key}", namespace: "${namespace}"}`)}]) {
            key
            namespace
            type
            value
            reference {
              ${subMetaObjectQuery}
            }
            references(first: 100) {
              edges {
                node {
                  ${subMetaObjectQuery}
                }
              }
            }
        }
      `);

      const metafieldQueries = (`
      ${metaObjectQuery(
        queryOptions?.metafields?.map(namespaceAndKey =>
          namespaceAndKey.includes('.')
            ? ({ key: namespaceAndKey.split('.')[1], namespace: namespaceAndKey.split('.')[0] })
            : ({ key: namespaceAndKey, namespace: "custom" })
        )
      )}
      `);

      const productImagesQuery = (`
        images(first: 10) {
          nodes {
            src
          }
        }
      `);

      const variantImageQuery = (`
        image {
          src
        }
      `)

      const querySelector = queryOptions?.isProductHandle
        ? `product(handle: "${productId}")`
        : `product(id: "${productId}")`;

      // const query = `
      //   ${querySelector} {
      //     ${queryOptions?.productFields?.join('\n')}
      //     ${queryOptions?.includeProductMetafields ? metafieldQueries : ''}
      //     ${queryOptions.includeProductImages ? productImagesQuery : ''}
      //     variants(first: 100) {
      //       edges {
      //         node {
      //           ${queryOptions?.variantFields?.join('\n')}
      //           ${queryOptions?.includeVariantMetafields ? metafieldQueries : ''}
      //           ${queryOptions.includeVariantImages ? variantImageQuery : ''}
      //         }
      //       }
      //     }
      //   }`;

      // console.log('jeshua pre query', {
      //   key: ['productVariants', String(productId), subQueryKey],
      //   graphQl: query,
      // })
      const result = useQuery(['productVariants', String(productId), subQueryKey], `
        ${querySelector} {
          ${queryOptions?.productFields?.join('\n')}
          ${queryOptions?.includeProductMetafields ? metafieldQueries : ''}
          ${queryOptions.includeProductImages ? productImagesQuery : ''}
          variants(first: 100) {
            edges {
              node {
                ${queryOptions?.variantFields?.join('\n')}
                ${queryOptions?.includeVariantMetafields ? metafieldQueries : ''}
                ${queryOptions.includeVariantImages ? variantImageQuery : ''}
              }
            }
          }
        }`,
        { enabled: !!productId }
      );
      const { data } = result;
      console.log('jeshua data', data)
      return {
        ...result,
        data: domain.humanizeProduct(data?.product)
      }
    },

    useGetMetaObject(metaobjectId, options = { includeMetafieldImages: false }) {
      if (!metaobjectId) {
        return {
          isLoading: false,
          data: undefined,
        }
      }
      const result = useQuery(['metaobject', metaobjectId], `
        metaobject(id: "${metaobjectId}") {
          fields {
            key
            type
            value
            ${options?.includeMetafieldImages ? (`
              reference {
                ...on MediaImage {
                  image {
                    originalSrc
                  }
                }
              }
            `) : ''}
          }
        }`
      );

      return {
        ...result,
        data: humanizeMetaObject(result.data?.metaobject),
      }
    },

    useGetMetaObjects(metaobjectIds, options = { includeMetafieldImages: false }) {
      const queries = metaobjectIds && metaobjectIds?.map((metaobjectId) => {
        return `
          metaobject(id: "${metaobjectId}") {
            fields {
              key
              type
              value
              ${options?.includeMetafieldImages ? (`
                reference {
                  ...on MediaImage {
                    image {
                      originalSrc
                    }
                  }
                }
              `) : ''}
            }
          }`
      });

      const results = useQuery(['metaobjects', ...metaobjectIds], queries);
      if (metaobjectIds === null || typeof metaobjectIds === 'string') {
        return {
          isLoading: false,
          data: undefined,
        }
      }
      if (metaobjectIds === undefined) {
        return {
          isLoading: true,
          data: undefined,
        }
      }

      const isLoading = results.isLoading;
      const data = results.data?.map((result) => humanizeMetaObject(result?.metaobject))
      return {
        isLoading,
        data: data,
      }
    },

    useGetVideo(videoId) {
      const query = videoId ? `
        node(id: "${videoId}") {
          ...on Video {
            sources {
              url
            }
          }
        }` : '';

      const result = useQuery(['video', videoId], query
      );

      if (!videoId) {
        return {
          isLoading: false,
          data: undefined,
        }
      }

      return {
        ...result,
        data: result.data?.node?.sources[0]?.url,
      }
    },

    /**
     * Query Wrapper
     *
     * Fetches and caches graphql queries
     * @param {string[]} queryKey
     * @param {string | string[] | undefined} graphQl
     * @param { { enabled: boolean } } options
     * @return { {  data: object | null, isLoading: boolean, isError: boolean, error: any, refetch: () => void; }}
     */
    useQueryWrapper: (queryKey, graphQl, options = { enabled: true }) => {
      const [data, setData] = useState(null);
      const [isLoading, setIsLoading] = useState(true);
      const [shouldReloadCache, setShouldReloadCache] = useState(false);
      const isMountedRef = useRef(true);
      const key = hashKey(queryKey);
      globalThis.mmCache = globalThis?.mmCache || new Map();
      const queryHash = hashKey(queryKey);
      const lastQueryTemplate = useRef(graphQl);
      const queryTemplateChanged = partialDeepEqual(lastQueryTemplate.current, graphQl);
      lastQueryTemplate.current = graphQl;

      useEffect(async () => {
        console.log('jeshua useQueryWrapper')
        if (!isMountedRef.current) return;
        console.log('jeshua useQueryWrapper running', { key, graphQl })

        async function fetchData() {
          if (options?.enabled == false || !graphQl) {
            return;
          }
          if (!globalThis.mmCache.has(key) || shouldReloadCache) {
            setIsLoading(true);
            let result;
            if (typeof graphQl === 'string') {
              result = humanize(await fetchApi(graphQl));
              // console.log('not using cache', key)
            } else {
              // console.log('not using cache', key)
              result = graphQl.map(async query => humanize(await fetchApi(query)));
              result = await Promise.all(result);
            }
            // add this line
            setIsLoading(false);
            setData(result);
            setShouldReloadCache(false);
            globalThis.mmCache.set(key, result);
          } else {
            setIsLoading(false);
            setData(globalThis.mmCache.get(key));
            // console.log('using cache', key);
          }
        }

        fetchData();

        return () => {
          void (isMountedRef.current = false);
        };
      }, [queryHash, shouldReloadCache, options.enabled, queryTemplateChanged]);

      return {
        isLoading,
        isError: false,
        error: null,
        data: data,
        refetch: () => {
          setShouldReloadCache(true);
        },
      }
    }
  })
}


/*******************************************************************************
 * Shared Utils
 *******************************************************************************/
/**
 * @return {Promise<{ any }>}
 */
function fetchApi(graphQl) {
  let result = fetch(`/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/graphql',
      'X-Shopify-Storefront-Access-Token': API_ACCESS_TOKEN,
      'Accept': 'application/json'
    },
    body: `query {
      ${graphQl}
    }`,
  })
    .then((res) => res.json())
    .then((result) => {
      if (!result.data) {
        console.log('jeshua result 2', result);
        debugger;
        console.error('MM - Error fetching graphql');
        const answeredYes = confirm('Oops! We we unable to load the app. Press OK to refresh the page or contact support if the issue persists.');
        if (answeredYes) {
          location.reload();
        }
        console.error(result);
      }

      return result.data;
    });

  return result;
}

function sizedImageUrl(url, size) {
  if (!url?.length) return undefined;
  return url
    ?.replace('.jpg', `_${size}x.jpg`)
    ?.replace('.png', `_${size}x.png`)
    ?.replace('.webp', `_${size}x.webp`)
}

function preloadImage(url) {
  if (!url) {
    return;
  }
  const img = new Image();
  img.src = url;
}

function humanizeMetaObject(metaObject) {
  if (!metaObject) return undefined;
  const parsedObject = {};
  metaObject?.fields?.forEach((field) => {
    try {
      parsedObject[field.key] = JSON.parse(field.value);
    } catch (e) {
      parsedObject[field.key] = field.value;
      if (field.reference?.image?.originalSrc) {
        parsedObject[field.key] = field.reference?.image?.originalSrc;
      }
    }
  });
  return parsedObject;
}

function floatToUsd(price) {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  });

  return formatter.format(price);
}

function safeParse(json, isReady = true) {
  if (!isReady) {
    // this is so that our app shows loading initially
    return undefined;
  }
  try {
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

const cache = new Map();

/**
 * A very minimal version of the `useQuery` hook, with a never expiring cache.
 * Prevents race conditions by ignoring outdated requests. Query keys are hashed
 * in a stable way to compare them properly, and can contain any serializable
 * value.
 *
 * @param {ReadonlyArray<unknown>} queryKey An array of serializable values that uniquely identify the query
 * @param {string | string[]} queryTemplate The GraphQL template to fetch the data from
 * @param { {enabled?: boolean} } options Additional options: whether the query is `enabled`
 * @returns The result of the query
 */
export function useQuery(
  queryKey,
  queryTemplate,
  options = {}
) {
  const { enabled = !!queryTemplate } = options;

  // We store state in a single object to make it easier to keep all state in sync
  const [state, setState] = useState({
    isLoading: true,
    isError: false,
    error: undefined,
    data: undefined,
  });

  const [refetchId, setRefetchId] = useState("");
  const lastRefetchIdHandled = useRef("");

  const queryHash = hashKey(queryKey);
  const lastQueryTemplate = useRef(queryTemplate);
  const queryTemplateChanged = partialDeepEqual(lastQueryTemplate.current, queryTemplate);
  lastQueryTemplate.current = queryTemplate;

  useEffect(() => {
    let ignore = false;

    async function fetchData() {
      try {
        const forceRefetch = refetchId !== lastRefetchIdHandled.current;

        // Check cache first
        if (forceRefetch === false && cache.has(queryHash)) {
          setState({
            isLoading: false,
            isError: false,
            error: undefined,
            data: cache.get(queryHash),
          });
          return;
        }

        // Forced refetch or no cache, continue to fetch data

        // Set loading state
        setState((prevState) => ({
          ...prevState,
          isLoading: true,
          isError: false,
        }));

        // Update the refetch id to ensure we don't handle the same refetch multiple times
        lastRefetchIdHandled.current = refetchId;

        let data;
        // Fetch the data
        if (typeof queryTemplate === 'string') {
          data = humanize(await fetchApi(queryTemplate));
        } else {
          const results = queryTemplate.map(async query => humanize(await fetchApi(query)));
          data = await Promise.all(results);
        }

        // Ensure the effect hasn't been cleaned up
        if (!ignore) {
          cache.set(queryHash, data);
          setState({
            isLoading: false,
            isError: false,
            error: undefined,
            data,
          });
        }
      } catch (error) {
        // Ensure the effect hasn't been cleaned up
        if (!ignore) {
          setState({
            isLoading: false,
            isError: true,
            error,
            data: undefined,
          });
        }
      }
    }

    if (enabled) {
      fetchData();
    }

    return () => {
      // Ensures we don't update state after the effect has been cleaned up
      ignore = true;
    };
  }, [queryHash, queryTemplateChanged, enabled, refetchId]);

  const refetch = () => {
    setRefetchId("T" + Date.now());
  };

  return { ...state, refetch };
}

// Utils
// =============================================================================

/**
 * @param {ReadonlyArray<unknown>} queryKey
 */
function hashKey(queryKey) {
  return JSON.stringify(queryKey, (_, val) =>
    isPlainObject(val)
      ? Object.keys(val)
        .sort()
        .reduce((result, key) => {
          result[key] = val[key];
          return result;
        }, {})
      : val
  );
}

// Copied from: https://github.com/jonschlinkert/is-plain-object
function isPlainObject(o) {
  if (!hasObjectPrototype(o)) {
    return false;
  }

  // If has no constructor
  const ctor = o.constructor;
  if (ctor === undefined) {
    return true;
  }

  // If has modified prototype
  const prot = ctor.prototype;
  if (!hasObjectPrototype(prot)) {
    return false;
  }

  // If constructor does not have an Object-specific method
  if (!prot.hasOwnProperty("isPrototypeOf")) {
    return false;
  }

  // Most likely a plain Object
  return true;
}

function hasObjectPrototype(o) {
  return Object.prototype.toString.call(o) === "[object Object]";
}

/**
 * Checks if `b` partially matches with `a`.
 */
export function partialDeepEqual(a, b) {
  if (a === b) {
    return true
  }

  if (typeof a !== typeof b) {
    return false
  }

  if (a && b && typeof a === 'object' && typeof b === 'object') {
    return !Object.keys(b).some(key => !partialDeepEqual(a[key], b[key]))
  }

  return false
}

function updateUrlParams(keyOrLabel, value) {
  if (!keyOrLabel) return;
  const key = getLabelToParam(keyOrLabel)
  // @ts-ignore
  const url = new URL(window.location);
  if (value !== null && value !== undefined) {
    url.searchParams.set(key, value);
  } else {
    url.searchParams.delete(key);
  }
  window.history.pushState({}, '', url);
}

function getLabelToParam(label) {
  return label?.toLowerCase().replace(' ', '-').replace('/', '-');
}

/**
 * @param {object} props
 * @param {string} props.holsterKey
 * @param {object} [props.product]
 * @param {Array<{id: string, title: string, displayTitle?: string; }>} [props.availableChoices]
 *
 * @returns {object | undefined}
 */
function getChoiceFromUrlParam(props) {
  let choiceFromUrlParam = undefined;
  const { holsterKey, product, availableChoices } = props;
  const labelToParam = getLabelToParam(holsterKey);
  if (!labelToParam) return;
  const urlParamForSelect = URL_PARAMS.get(labelToParam);
  /** @type {object | undefined} */
  if (product) {
    choiceFromUrlParam = product?.variants?.find(variant =>
      variant?.id === urlParamForSelect ||
      variant?.title?.toLowerCase().includes(urlParamForSelect?.toLowerCase()) ||
      product?.title?.toLowerCase().includes(urlParamForSelect?.toLowerCase())
    )
  }
  else if (availableChoices) {
    choiceFromUrlParam = urlParamForSelect
      ? availableChoices?.find(choice => choice.id === urlParamForSelect || choice.title.toLowerCase().includes(urlParamForSelect?.toLowerCase()))
      : null;
  }
  return choiceFromUrlParam;
}

function startViewTransition(callback, options) {
  // @ts-ignore
  const browserSupportsViewTransitions = !!document.startViewTransition;
  if (!!browserSupportsViewTransitions && options?.skipTransition !== false) {
    // @ts-ignore
    document.startViewTransition(callback)
    return;
  }
  callback();
}

function LoadingIcon() {
  /** @type {HolsterContext} */
  const { holster } = useContext(HolsterStateContext);

  const loadingOverlayClass = css({
    ':root': {
      '--right-side-content-width': '0',
    },
    '@media (min-width: 750px)': {
      '--right-side-content-width': '400px',
    },
    '@media (min-width: 1280px)': {
      '--right-side-content-width': '500px',
    },
    label: 'loading-overlay',
    position: 'absolute',
    inset: '0',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
    '&::before': {
      content: '""',
      position: 'absolute',
      inset: '0',
      background: 'black',
      opacity: 0.2,
    },
    "& svg": {
      marginRight: 'var(--right-side-content-width)',
    },

  });

  const isAnyLoading = Object.keys(holster.isLoading).some(key => holster.isLoading[key])

  if (!isAnyLoading) {
    return null;
  }

  return html`
    <div className=${cx(loadingOverlayClass)}>
      <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="display: block;" width="100px" height="100px" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid">
        <circle cx="50" cy="50" r="32" stroke-width="8" stroke="#281300" stroke-dasharray="50.26548245743669 50.26548245743669" fill="none" stroke-linecap="round">
          <animateTransform attributeName="transform" type="rotate" dur="1s" repeatCount="indefinite" keyTimes="0;1" values="0 50 50;360 50 50"></animateTransform>
        </circle>
        <circle cx="50" cy="50" r="23" stroke-width="8" stroke="#e26c00" stroke-dasharray="36.12831551628262 36.12831551628262" stroke-dashoffset="36.12831551628262" fill="none" stroke-linecap="round">
          <animateTransform attributeName="transform" type="rotate" dur="1s" repeatCount="indefinite" keyTimes="0;1" values="0 50 50;-360 50 50"></animateTransform>
        </circle>
      </svg>
    </div>
  `
}
