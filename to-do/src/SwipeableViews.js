import * as React from 'react';
import PropTypes from 'prop-types';
import warning from 'warning';

function addEventListener(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return {
        remove() {
            node.removeEventListener(event, handler, options);
        },
    };
}

const styles = {
    container: {
        direction: 'ltr',
        display: 'flex',
        willChange: 'transform',
    },
    slide: {
        width: '100%',
        WebkitFlexShrink: 0,
        flexShrink: 0,
        overflow: 'auto',
    },
};

const axisProperties = {
    root: {
        x: {
            overflowX: 'hidden',
        },
        'x-reverse': {
            overflowX: 'hidden',
        },
        y: {
            overflowY: 'hidden',
        },
        'y-reverse': {
            overflowY: 'hidden',
        },
    },
    flexDirection: {
        x: 'row',
        'x-reverse': 'row-reverse',
        y: 'column',
        'y-reverse': 'column-reverse',
    },
    transform: {
        x: translate => `translate(${-translate}%, 0)`,
        'x-reverse': translate => `translate(${translate}%, 0)`,
        y: translate => `translate(0, ${-translate}%)`,
        'y-reverse': translate => `translate(0, ${translate}%)`,
    },
    length: {
        x: 'width',
        'x-reverse': 'width',
        y: 'height',
        'y-reverse': 'height',
    },
    rotationMatrix: {
        x: {
            x: [1, 0],
            y: [0, 1],
        },
        'x-reverse': {
            x: [-1, 0],
            y: [0, 1],
        },
        y: {
            x: [0, 1],
            y: [1, 0],
        },
        'y-reverse': {
            x: [0, -1],
            y: [1, 0],
        },
    },
    scrollPosition: {
        x: 'scrollLeft',
        'x-reverse': 'scrollLeft',
        y: 'scrollTop',
        'y-reverse': 'scrollTop',
    },
    scrollLength: {
        x: 'scrollWidth',
        'x-reverse': 'scrollWidth',
        y: 'scrollHeight',
        'y-reverse': 'scrollHeight',
    },
    clientLength: {
        x: 'clientWidth',
        'x-reverse': 'clientWidth',
        y: 'clientHeight',
        'y-reverse': 'clientHeight',
    },
};

function createTransition(property, options) {
    const { duration, easeFunction, delay } = options;

    return `${property} ${duration} ${easeFunction} ${delay}`;
}

// We are using a 2x2 rotation matrix.
function applyRotationMatrix(touch, axis) {
    const rotationMatrix = axisProperties.rotationMatrix[axis];

    return {
        pageX: rotationMatrix.x[0] * touch.pageX + rotationMatrix.x[1] * touch.pageY,
        pageY: rotationMatrix.y[0] * touch.pageX + rotationMatrix.y[1] * touch.pageY,
    };
}

function adaptMouse(event) {
    event.touches = [{ pageX: event.pageX, pageY: event.pageY }];
    return event;
}

export function getDomTreeShapes(element, rootNode) {
    let domTreeShapes = [];

    while (element && element !== rootNode && element !== document.body) {
        // We reach a Swipeable View, no need to look higher in the dom tree.
        if (element.hasAttribute('data-swipeable')) {
            break;
        }

        const style = window.getComputedStyle(element);

        if (
            // Ignore the scroll children if the element is absolute positioned.
            style.getPropertyValue('position') === 'absolute' ||
            // Ignore the scroll children if the element has an overflowX hidden
            style.getPropertyValue('overflow-x') === 'hidden'
        ) {
            domTreeShapes = [];
        } else if (
            (element.clientWidth > 0 && element.scrollWidth > element.clientWidth) ||
            (element.clientHeight > 0 && element.scrollHeight > element.clientHeight)
        ) {
            // Ignore the nodes that have no width.
            // Keep elements with a scroll
            domTreeShapes.push({
                element,
                scrollWidth: element.scrollWidth,
                scrollHeight: element.scrollHeight,
                clientWidth: element.clientWidth,
                clientHeight: element.clientHeight,
                scrollLeft: element.scrollLeft,
                scrollTop: element.scrollTop,
            });
        }

        element = element.parentNode;
    }

    return domTreeShapes;
}

// We can only have one node at the time claiming ownership for handling the swipe.
// Otherwise, the UX would be confusing.
// That's why we use a singleton here.
let nodeWhoClaimedTheScroll = null;

export function findNativeHandler(params) {
    const { domTreeShapes, pageX, startX, axis } = params;

    return domTreeShapes.some(shape => {
        // Determine if we are going backward or forward.
        let goingForward = pageX >= startX;
        if (axis === 'x' || axis === 'y') {
            goingForward = !goingForward;
        }

        // scrollTop is not always be an integer.
        // https://github.com/jquery/api.jquery.com/issues/608
        const scrollPosition = Math.round(shape[axisProperties.scrollPosition[axis]]);

        const areNotAtStart = scrollPosition > 0;
        const areNotAtEnd =
            scrollPosition + shape[axisProperties.clientLength[axis]] <
            shape[axisProperties.scrollLength[axis]];

        if ((goingForward && areNotAtEnd) || (!goingForward && areNotAtStart)) {
            nodeWhoClaimedTheScroll = shape.element;
            return true;
        }

        return false;
    });
}

export const SwipeableViewsContext = React.createContext();

if (process.env.NODE_ENV !== 'production') {
    SwipeableViewsContext.displayName = 'SwipeableViewsContext';
}

class SwipeableViews extends React.Component {
    rootNode = null;

    containerNode = null;

    ignoreNextScrollEvents = false;

    viewLength = 0;

    startX = 0;

    lastX = 0;

    vx = 0;

    startY = 0;

    isSwiping = undefined;

    started = false;

    startIndex = 0;

    transitionListener = null;

    touchMoveListener = null;

    activeSlide = null;

    indexCurrent = null;

    firstRenderTimeout = null;

    constructor(props) {
        super(props);

     

        this.state = {
            indexLatest: props.index,
            // Set to true as soon as the component is swiping.
            // It's the state counter part of this.isSwiping.
            isDragging: false,
            // Help with SSR logic and lazy loading logic.
            renderOnlyActive: !props.disableLazyLoading,
            heightLatest: 0,
            // Let the render method that we are going to display the same slide than previously.
            displaySameSlide: true,
        };
        this.setIndexCurrent(props.index);
    }

    componentDidMount() {
        // Subscribe to transition end events.
        this.transitionListener = addEventListener(this.containerNode, 'transitionend', event => {
            if (event.target !== this.containerNode) {
                return;
            }

            this.handleTransitionEnd();
        });

        // Block the thread to handle that event.
        this.touchMoveListener = addEventListener(
            this.rootNode,
            'touchmove',
            event => {
                // Handling touch events is disabled.
                if (this.props.disabled) {
                    return;
                }
                this.handleSwipeMove(event);
            },
            {
                passive: false,
            },
        );

        if (!this.props.disableLazyLoading) {
            this.firstRenderTimeout = setTimeout(() => {
                this.setState({
                    renderOnlyActive: false,
                });
            }, 0);
        }

        // Send all functions in an object if action param is set.
        if (this.props.action) {
            this.props.action({
                updateHeight: this.updateHeight,
            });
        }
    }

    // eslint-disable-next-line camelcase,react/sort-comp
    UNSAFE_componentWillReceiveProps(nextProps) {
        const { index } = nextProps;

       
            this.setIndexCurrent(index);
            this.setState({
                // If true, we are going to change the children. We shoudn't animate it.
               
                indexLatest: index,
            });
        }
    }

        if (this.containerNode) {
            const { axis } = this.props;
          
            this.containerNode.style.WebkitTransform = transform;
            this.containerNode.style.transform = transform;
        }

        const computedStyle = window.getComputedStyle(this.containerNode);
        const transform =
            computedStyle.getPropertyValue('-webkit-transform') ||
            computedStyle.getPropertyValue('transform');

        if (transform && transform !== 'none') {
            const transformValues = transform
                .split('(')[1]
                .split(')')[0]
                .split(',');
            const rootStyle = window.getComputedStyle(this.rootNode);

            const tranformNormalized = applyRotationMatrix(
                {
                    pageX: parseInt(transformValues[4], 10),
                    pageY: parseInt(transformValues[5], 10),
                },
                axis,
            );

            this.startIndex =
                -tranformNormalized.pageX /
                (this.viewLength -
                    parseInt(rootStyle.paddingLeft, 10) -
                    parseInt(rootStyle.paddingRight, 10)) || 0;
        }

   
        nodeWhoClaimedTheScroll = null;

        // The touch start event can be cancel.
        // Makes sure that a starting point is set.
       

        this.started = false;


        const indexLatest = this.state.indexLatest;
        const indexCurrent = this.indexCurrent;
        const delta = indexLatest - indexCurrent;

        let indexNew;

        // Quick movement
        if (Math.abs(this.vx) > this.props.threshold) {
            if (this.vx > 0) {
                indexNew = Math.floor(indexCurrent);
            } else {
                indexNew = Math.ceil(indexCurrent);
            }
        } else if (Math.abs(delta) > this.props.hysteresis) {
            // Some hysteresis with indexLatest.
            indexNew = delta > 0 ? Math.floor(indexCurrent) : Math.ceil(indexCurrent);
        } else {
            indexNew = indexLatest;
        }

        const indexMax = React.Children.count(this.props.children) - 1;

        if (indexNew < 0) {
            indexNew = 0;
        } else if (indexNew > indexMax) {
            indexNew = indexMax;
        }

        this.setIndexCurrent(indexNew);
        this.setState(
            {
                indexLatest: indexNew,
                isDragging: false,
            },
            () => {
                if (this.props.onSwitching) {
                    this.props.onSwitching(indexNew, 'end');
                }

                if (this.props.onChangeIndex && indexNew !== indexLatest) {
                    this.props.onChangeIndex(indexNew, indexLatest, {
                        reason: 'swipe',
                    });
                }

                // Manually calling handleTransitionEnd in that case as isn't otherwise.
                if (indexCurrent === indexLatest) {
                    this.handleTransitionEnd();
                }
            },
        );
        if (this.props.onChangeIndex && indexNew !== indexLatest) {
            this.props.onChangeIndex(indexNew, indexLatest, {
                reason: 'focus',
            });
        }

    
        const {
            action,
            animateHeight,
            animateTransitions,
            axis,
            children,
            containerStyle: containerStyleProp,
            disabled,
            disableLazyLoading,
            enableMouseEvents,
            hysteresis,
            ignoreNativeScroll,
            index,
            onChangeIndex,
            onSwitching,
            onTransitionEnd,
            resistance,
            slideStyle: slideStyleProp,
            slideClassName,
            springConfig,
            style,
            threshold,
            ...other
        } = this.props;

        const {
            displaySameSlide,
            heightLatest,
            isDragging,
            renderOnlyActive,
        } = this.state;
        const touchEvents = !disabled
            ? {
                onTouchStart: this.handleTouchStart,
                onTouchEnd: this.handleTouchEnd,
            }
            : {};
        const mouseEvents =
            !disabled && enableMouseEvents
                ? {
                    onMouseDown: this.handleMouseDown,
                    onMouseUp: this.handleMouseUp,
                    onMouseLeave: this.handleMouseLeave,
                    onMouseMove: this.handleMouseMove,
                }
                : {};

        // There is no point to animate if we are already providing a height.
        warning(
            !animateHeight || !containerStyleProp || !containerStyleProp.height,
            `react-swipeable-view: You are setting animateHeight to true but you are
also providing a custom height.
The custom height has a higher priority than the animateHeight property.
So animateHeight is most likely having no effect at all.`,
        );

        const slideStyle = Object.assign({}, styles.slide, slideStyleProp);

        let transition;
        let WebkitTransition;

        if (isDragging || !animateTransitions || displaySameSlide) {
            transition = 'all 0s ease 0s';
            WebkitTransition = 'all 0s ease 0s';
        } else {
            transition = createTransition('transform', springConfig);
            WebkitTransition = createTransition('-webkit-transform', springConfig);

            if (heightLatest !== 0) {
                const additionalTranstion = `, ${createTransition('height', springConfig)}`;
                transition += additionalTranstion;
                WebkitTransition += additionalTranstion;
            }
        }

        const containerStyle = {
            height: null,
            WebkitFlexDirection: axisProperties.flexDirection[axis],
            flexDirection: axisProperties.flexDirection[axis],
            WebkitTransition,
            transition,
        };

        // Apply the styles for SSR considerations
        if (!renderOnlyActive) {
            const transform = axisProperties.transform[axis](this.indexCurrent * 100);
            containerStyle.WebkitTransform = transform;
            containerStyle.transform = transform;
        }

        if (animateHeight) {
            containerStyle.height = heightLatest;
        }

        
            <SwipeableViewsContext.Provider value={this.getSwipeableViewsContext()}>
                <div
                    ref={this.setRootNode}
                    style={Object.assign({}, axisProperties.root[axis], style)}
                    {...other}
                    {...touchEvents}
                    {...mouseEvents}
                    onScroll={this.handleScroll}
                >
                    <div
                        ref={this.setContainerNode}
                        style={Object.assign({}, containerStyle, styles.container, containerStyleProp)}
                        className="react-swipeable-view-container"
                    >
                        {React.Children.map(children, (child, indexChild) => {
                            if (renderOnlyActive && indexChild !== indexLatest) {
                                return null;
                            }

                            warning(
                                React.isValidElement(child),
                                `react-swipeable-view: one of the children provided is invalid: ${child}.
  We are expecting a valid React Element`,
                            );

                            let ref;
                            let hidden = true;

                            if (indexChild === indexLatest) {
                                hidden = false;

                                if (animateHeight) {
                                    ref = this.setActiveSlide;
                                    slideStyle.overflowY = 'hidden';
                                }
                            }

                            return (
                                <div
                                    ref={ref}
                                    style={slideStyle}
                                    className={slideClassName}
                                    aria-hidden={hidden}
                                    data-swipeable="true"
                                >
                                    {child}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </SwipeableViewsContext.Provider>
        
    


// Added as an ads for people using the React dev tools in production.
// So they know, the tool used to build the awesome UI they
// are looking at/retro engineering.
SwipeableViews.displayName = 'ReactSwipableView';

SwipeableViews.propTypes = {
    /**
     * This is callback property. It's called by the component on mount.
     * This is useful when you want to trigger an action programmatically.
     * It currently only supports updateHeight() action.
     *
     * @param {object} actions This object contains all posible actions
     * that can be triggered programmatically.
     */
    action: PropTypes.func,
    /**
     * If `true`, the height of the container will be animated to match the current slide height.
     * Animating another style property has a negative impact regarding performance.
     */
    animateHeight: PropTypes.bool,
    /**
     * If `false`, changes to the index prop will not cause an animated transition.
     */
    animateTransitions: PropTypes.bool,
    /**
     * The axis on which the slides will slide.
     */
    axis: PropTypes.oneOf(['x', 'x-reverse', 'y', 'y-reverse']),
    /**
     * Use this property to provide your slides.
     */
    children: PropTypes.node.isRequired,
    /**
     * This is the inlined style that will be applied
     * to each slide container.
     */
    containerStyle: PropTypes.object,
    /**
     * If `true`, it will disable touch events.
     * This is useful when you want to prohibit the user from changing slides.
     */
    disabled: PropTypes.bool,
    /**
     * This is the config used to disable lazyloding,
     * if `true` will render all the views in first rendering.
     */
    disableLazyLoading: PropTypes.bool,
    /**
     * If `true`, it will enable mouse events.
     * This will allow the user to perform the relevant swipe actions with a mouse.
     */
    enableMouseEvents: PropTypes.bool,
    /**
     * Configure hysteresis between slides. This value determines how far
     * should user swipe to switch slide.
     */
    hysteresis: PropTypes.number,
    /**
     * If `true`, it will ignore native scroll container.
     * It can be used to filter out false positive that blocks the swipe.
     */
    ignoreNativeScroll: PropTypes.bool,
    /**
     * This is the index of the slide to show.
     * This is useful when you want to change the default slide shown.
     * Or when you have tabs linked to each slide.
     */
    index: PropTypes.number,
    /**
     * This is callback prop. It's call by the
     * component when the shown slide change after a swipe made by the user.
     * This is useful when you have tabs linked to each slide.
     *
     * @param {integer} index This is the current index of the slide.
     * @param {integer} indexLatest This is the oldest index of the slide.
     * @param {object} meta Meta data containing more information about the event.
     */
    onChangeIndex: PropTypes.func,
    /**
     * @ignore
     */
    onMouseDown: PropTypes.func,
    /**
     * @ignore
     */
    onMouseLeave: PropTypes.func,
    /**
     * @ignore
     */
    onMouseMove: PropTypes.func,
    /**
     * @ignore
     */
    onMouseUp: PropTypes.func,
    /**
     * @ignore
     */
    onScroll: PropTypes.func,
    /**
     * This is callback prop. It's called by the
     * component when the slide switching.
     * This is useful when you want to implement something corresponding
     * to the current slide position.
     *
     * @param {integer} index This is the current index of the slide.
     * @param {string} type Can be either `move` or `end`.
     */
    onSwitching: PropTypes.func,
    /**
     * @ignore
     */
    onTouchEnd: PropTypes.func,
    /**
     * @ignore
     */
    onTouchMove: PropTypes.func,
    /**
     * @ignore
     */
    onTouchStart: PropTypes.func,
    /**
     * The callback that fires when the animation comes to a rest.
     * This is useful to defer CPU intensive task.
     */
    onTransitionEnd: PropTypes.func,
    /**
     * If `true`, it will add bounds effect on the edges.
     */
    resistance: PropTypes.bool,
    /**
     * This is the className that will be applied
     * on the slide component.
     */
    slideClassName: PropTypes.string,
    /**
     * This is the inlined style that will be applied
     * on the slide component.
     */
    slideStyle: PropTypes.object,
    /**
     * This is the config used to create CSS transitions.
     * This is useful to change the dynamic of the transition.
     */
    springConfig: PropTypes.shape({
        delay: PropTypes.string,
        duration: PropTypes.string,
        easeFunction: PropTypes.string,
    }),
    /**
     * This is the inlined style that will be applied
     * on the root component.
     */
    style: PropTypes.object,
    /**
     * This is the threshold used for detecting a quick swipe.
     * If the computed speed is above this value, the index change.
     */
    threshold: PropTypes.number,
};

SwipeableViews.defaultProps = {
    animateHeight: false,
    animateTransitions: true,
    axis: 'x',
    disabled: false,
    disableLazyLoading: false,
    enableMouseEvents: false,
    hysteresis: 0.6,
    ignoreNativeScroll: false,
    index: 0,
    threshold: 5,
    springConfig: {
        duration: '0.35s',
        easeFunction: 'cubic-bezier(0.15, 0.3, 0.25, 1)',
        delay: '0s',
    },
    resistance: false,
};

export default SwipeableViews;
