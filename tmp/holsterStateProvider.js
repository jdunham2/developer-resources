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
