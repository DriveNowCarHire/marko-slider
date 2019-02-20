/**
 * 
 * Moast of this code has been ported from https://github.com/pawelgrzybek/siema Thanks :)
 */

/**
 * Determine if browser supports unprefixed transform property.
 * Google Chrome since version 26 supports prefix-less transform
 * @returns {string} - Transform property supported by client.
 */
function transformPropertyName() {
  const style = document.documentElement.style;
  if (typeof style.transform === 'string') {
    return 'transform';
  }
  return 'WebkitTransform';
}


class Slider {

    constructor(component) {

      var slider = this
      this.api = {
        get currentSlide() {
          // debugger
          if (slider.currentSlide < 0) {
            return slider.numSlides + slider.currentSlide + 1
          }
          else return slider.currentSlide + 1;
        }
        ,
        get numSlides() {
          return slider.numSlides
        }
      }
      this.component = component;

      // Merge defaults with user's settings
      this.config = Object.assign({}, DEFAULT_OPTIONS, component.input)
  
      // update perPage number dependable of user value
      this.resolveSlidesNumber();
  
      // Create global references
      this.currentSlide = this.config.loop ?
        this.config.startIndex % this.numSlides :
        Math.max(0, Math.min(this.config.startIndex, this.numSlides - this.perPage));
  
      // Bind all event handlers for referencability
      ['autoHandler', 'resizeHandler', 'touchstartHandler', 'touchendHandler', 'touchmoveHandler', 'mousedownHandler', 'mouseupHandler', 'mouseleaveHandler', 'mousemoveHandler', 'clickHandler', 'mouseenterHandler'].forEach(method => {
        this[method] = this[method].bind(this);
      });

    }

    autoHandler() {
      this.next()
    }
  
    emitChange() {
      if (this.emitLastCurrentSlide != this.currentSlide) {
        this.emitLastCurrentSlide = this.currentSlide
        setTimeout(()=>{
          // delay sending the change event so that the compoennt is not re-rendered untilt he current transition is finished
          this.component.emit("change", this.api)
        }, this.config.duration)
      }
    }

    get numSlides() {
      return this.component.input.slides.length
    }
  
    get sliderFrame() {
      return this.component.getEl("sliderFrame")
    }

    get selector() {
      return this.component.getEl()
    }

    subscribeTo(eventName, handler) {
      this.component.subscribeTo(this.component.getEl()).on(eventName, handler)
    }
  
    /**
     * Attaches listeners to required events.
     */
    attachEvents() {
      
      this.transformProperty = transformPropertyName();
      this.selectorWidth = this.component.getEl().offsetWidth

      // Resize element on window resize
      this.component.subscribeTo(window).on('resize', this.resizeHandler);
  
      // If element is draggable / swipable, add event handlers
      if (this.config.draggable) {
        // Keep track pointer hold and dragging distance
        this.pointerDown = false;
        this.drag = {
          startX: 0,
          endX: 0,
          startY: 0,
          letItGo: null,
          preventClick: false,
        };
  
        // Touch events
        this.subscribeTo('touchstart', this.touchstartHandler);
        this.subscribeTo('touchend', this.touchendHandler);
        this.subscribeTo('touchmove', this.touchmoveHandler);
  
        // Mouse events
        this.subscribeTo('mousedown', this.mousedownHandler);
        
        this.subscribeTo('mouseup', this.mouseupHandler);
        this.subscribeTo('mouseleave', this.mouseleaveHandler);
        this.subscribeTo('mousemove', this.mousemoveHandler);

        this.subscribeTo('mouseenter', this.mouseenterHandler);

  
        // Click
        this.subscribeTo('click', this.clickHandler);
      }

    }

    onMount() {
      this.attachEvents()
      this.component.forceUpdate()
      this.restartAutoInterval()
    }

    onRender() {
    //   if (this.component && this.component.getEl && this.sliderFrame) {
    //     this.disableTransition()
    //     this.enableTransitionOnUpdate = true
    //   }
    }
    updateWidth() {
      this.selectorWidth = this.component.getEl().offsetWidth

      const widthItem = this.selectorWidth / this.perPage;
      const itemsToBuild = this.config.loop ? this.numSlides + (2 * this.perPage) : this.numSlides;

      // Create frame and apply styling
      this.sliderFrame.style.width = `${widthItem * itemsToBuild}px`;
    }

    onUpdate() {
      this.updateWidth()
      
      this.slideToCurrent();

      this.emitChange()

      this.sliderFrame.style.visibility = 'visible'

      
      // if (this.enableTransitionOnUpdate) {
      //   this.enableTransitionOnUpdate = false
      // if (!this.aaa) {
      //   this.aaa = true
      //     requestAnimationFrame(()=>{
      //       requestAnimationFrame(()=>{
      //         this.enableTransition();
      //       })
      //     })
      //   }
      // }
    }

    restartAutoInterval() {
      this.stopAutoInterval()
      if (this.config.auto) {
          this.autoInterval = setInterval(this.autoHandler, Math.abs(this.config.auto))
      }
    }
    stopAutoInterval() {
      clearInterval(this.autoInterval)
    }

    onDestroy() {
      this.destroyed = true
      clearInterval(this.autoInterval)
    }


    /**
     * Build a sliderFrame and slide to a current item.
     */
    buildSliderFrame() {
      const widthItem = this.selectorWidth / this.perPage;
      const itemsToBuild = this.config.loop ? this.numSlides + (2 * this.perPage) : this.numSlides;

      // Create frame and apply styling
      this.sliderFrame.style.width = `${widthItem * itemsToBuild}px`;
      this.enableTransition();
  
      if (this.config.draggable) {
        this.selector.style.cursor = '-webkit-grab';
      }
 
      // Go to currently active slide after initial build
      this.slideToCurrent();
    }
  
    /**
     * Determinates slides number accordingly to clients viewport.
     */
    resolveSlidesNumber() {
      if (typeof this.config.perPage === 'number') {
        this.perPage = this.config.perPage;
      }
      else if (typeof this.config.perPage === 'object') {
        this.perPage = 1;
        for (const viewport in this.config.perPage) {
          if (window.innerWidth >= viewport) {
            this.perPage = this.config.perPage[viewport];
          }
        }
      }
    }
  
  
    /**
     * Go to previous slide.
     * @param {number} [howManySlides=1] - How many items to slide backward.
     * @param {function} callback - Optional callback function.
     */
    prev(howManySlides = 1, callback) {
      // early return when there is nothing to slide
      if (this.numSlides <= this.perPage) {
        return;
      }
  
      const beforeChange = this.currentSlide;
  
      if (this.config.loop) {
        const isNewIndexClone = this.currentSlide - howManySlides < 0;
        if (isNewIndexClone) {
          this.disableTransition();
  
          const mirrorSlideIndex = this.currentSlide + this.numSlides;
          const mirrorSlideIndexOffset = this.perPage;
          const moveTo = mirrorSlideIndex + mirrorSlideIndexOffset;
          const offset = (this.config.rtl ? 1 : -1) * moveTo * (this.selectorWidth / this.perPage);
          const dragDistance = this.config.draggable ? this.drag.endX - this.drag.startX : 0;
  
          this.sliderFrame.style[this.transformProperty] = `translate3d(${offset + dragDistance}px, 0, 0)`;
          this.currentSlide = mirrorSlideIndex - howManySlides;
        }
        else {
          this.currentSlide = this.currentSlide - howManySlides;
        }
      }
      else {
        this.currentSlide = Math.max(this.currentSlide - howManySlides, 0);
      }
  
      if (beforeChange !== this.currentSlide) {
        this.slideToCurrent(this.config.loop);
        this.emitChange()
        if (callback) {
          callback.call(this);
        }
      }
    }
  
  
    /**
     * Go to next slide.
     * @param {number} [howManySlides=1] - How many items to slide forward.
     * @param {function} callback - Optional callback function.
     */
    next(howManySlides = 1, callback) {

      // early return when there is nothing to slide
      if (this.numSlides <= this.perPage) {
        return;
      }
  
      const beforeChange = this.currentSlide;
  
      if (this.config.loop) {
        const isNewIndexClone = this.currentSlide + howManySlides > this.numSlides - this.perPage;
        if (isNewIndexClone) {
          this.disableTransition();
  
          const mirrorSlideIndex = this.currentSlide - this.numSlides;
          const mirrorSlideIndexOffset = this.perPage;
          const moveTo = mirrorSlideIndex + mirrorSlideIndexOffset;
          const offset = (this.config.rtl ? 1 : -1) * moveTo * (this.selectorWidth / this.perPage);
          const dragDistance = this.config.draggable ? this.drag.endX - this.drag.startX : 0;
  
          this.sliderFrame.style[this.transformProperty] = `translate3d(${offset + dragDistance}px, 0, 0)`;
          this.currentSlide = mirrorSlideIndex + howManySlides;
        }
        else {
          this.currentSlide = this.currentSlide + howManySlides;
        }
      }
      else {
        this.currentSlide = Math.min(this.currentSlide + howManySlides, this.numSlides - this.perPage);
      }
      if (beforeChange !== this.currentSlide) {
        this.slideToCurrent(this.config.loop);
        this.emitChange()
        if (callback) {
          callback.call(this);
        }
      }
    }
  
  
    /**
     * Disable transition on sliderFrame.
     */
    disableTransition() {
      // debugger
      this.sliderFrame.style.webkitTransition = `all 0ms ${this.config.easing}`;
      this.sliderFrame.style.transition = `all 0ms ${this.config.easing}`;
    }
  
  
    /**
     * Enable transition on sliderFrame.
     */
    enableTransition() {
      // debugger
      this.sliderFrame.style.webkitTransition = `all ${this.config.duration}ms ${this.config.easing}`;
      this.sliderFrame.style.transition = `all ${this.config.duration}ms ${this.config.easing}`;
    }
  
  
    /**
     * Go to slide with particular index
     * @param {number} index - Item index to slide to.
     * @param {function} callback - Optional callback function.
     */
    goTo(index, callback) {
      if (this.numSlides <= this.perPage) {
        return;
      }
      const beforeChange = this.currentSlide;
      this.currentSlide = this.config.loop ?
        index % this.numSlides :
        Math.min(Math.max(index, 0), this.numSlides - this.perPage);
      if (beforeChange !== this.currentSlide) {
        this.slideToCurrent();
        this.emitChange()
        if (callback) {
          callback.call(this);
        }
      }
    }
  
  
    /**
     * Moves sliders frame to position of currently active slide
     */
    slideToCurrent(enableTransition) {
      const currentSlide = this.config.loop ? this.currentSlide + this.perPage : this.currentSlide;
      const offset = (this.config.rtl ? 1 : -1) * currentSlide * (this.selectorWidth / this.perPage);
  
      if (enableTransition) {
        // This one is tricky, I know but this is a perfect explanation:
        // https://youtu.be/cCOL7MC4Pl0
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            this.enableTransition();
            this.sliderFrame.style[this.transformProperty] = `translate3d(${offset}px, 0, 0)`;
          });
        });
      }
      else {
        this.sliderFrame.style[this.transformProperty] = `translate3d(${offset}px, 0, 0)`;
      }

      this.restartAutoInterval()
    }
  
  
    /**
     * Recalculate drag /swipe event and reposition the frame of a slider
     */
    updateAfterDrag() {
      const movement = (this.config.rtl ? -1 : 1) * (this.drag.endX - this.drag.startX);
      const movementDistance = Math.abs(movement);
      const howManySliderToSlide = this.config.multipleDrag ? Math.ceil(movementDistance / (this.selectorWidth / this.perPage)) : 1;
  
      const slideToNegativeClone = movement > 0 && this.currentSlide - howManySliderToSlide < 0;
      const slideToPositiveClone = movement < 0 && this.currentSlide + howManySliderToSlide > this.numSlides - this.perPage;
  
      if (movement > 0 && movementDistance > this.config.threshold && this.numSlides > this.perPage) {
        this.prev(howManySliderToSlide);
      }
      else if (movement < 0 && movementDistance > this.config.threshold && this.numSlides > this.perPage) {
        this.next(howManySliderToSlide);
      }
      this.slideToCurrent(slideToNegativeClone || slideToPositiveClone);
    }
  
  
    /**
     * When window resizes, resize slider components as well
     */
    resizeHandler() {
      
      // update perPage number dependable of user value
      this.resolveSlidesNumber();
  
      // relcalculate currentSlide
      // prevent hiding items when browser width increases
      if (this.currentSlide + this.perPage > this.numSlides) {
        this.currentSlide = this.numSlides <= this.perPage ? 0 : this.numSlides - this.perPage;
      }
 
      this.updateWidth()
      this.disableTransition()
      this.slideToCurrent()

      requestAnimationFrame(()=>{
        requestAnimationFrame(()=>{
          this.enableTransition();
        })
      })
    }
  
  
    /**
     * Clear drag after touchend and mouseup event
     */
    clearDrag() {
      this.drag = {
        startX: 0,
        endX: 0,
        startY: 0,
        letItGo: null,
        preventClick: this.drag.preventClick
      };
      this.restartAutoInterval()
    }
  
  
    /**
     * touchstart event handler
     */
    touchstartHandler(e) {
      // Prevent dragging / swiping on inputs, selects and textareas
      const ignoreSiema = ['TEXTAREA', 'OPTION', 'INPUT', 'SELECT'].indexOf(e.target.nodeName) !== -1;
      if (ignoreSiema) {
        return;
      }
  
      e.stopPropagation();
      this.pointerDown = true;
      this.drag.startX = e.touches[0].pageX;
      this.drag.startY = e.touches[0].pageY;

      this.stopAutoInterval()
    }
  
  
    /**
     * touchend event handler
     */
    touchendHandler(e) {
      e.stopPropagation();
      this.pointerDown = false;
      this.enableTransition();
      if (this.drag.endX) {
        this.updateAfterDrag();
      }
      this.clearDrag();
    }
  
  
    /**
     * touchmove event handler
     */
    touchmoveHandler(e) {
      e.stopPropagation();
  
      if (this.drag.letItGo === null) {
        this.drag.letItGo = Math.abs(this.drag.startY - e.touches[0].pageY) < Math.abs(this.drag.startX - e.touches[0].pageX);
      }
  
      if (this.pointerDown && this.drag.letItGo) {
        e.preventDefault();
        this.drag.endX = e.touches[0].pageX;
        this.sliderFrame.style.webkitTransition = `all 0ms ${this.config.easing}`;
        this.sliderFrame.style.transition = `all 0ms ${this.config.easing}`;
  
        const currentSlide = this.config.loop ? this.currentSlide + this.perPage : this.currentSlide;
        const currentOffset = currentSlide * (this.selectorWidth / this.perPage);
        const dragOffset = (this.drag.endX - this.drag.startX);
        const offset = this.config.rtl ? currentOffset + dragOffset : currentOffset - dragOffset;
        this.sliderFrame.style[this.transformProperty] = `translate3d(${(this.config.rtl ? 1 : -1) * offset}px, 0, 0)`;
      }
    }
  
  
    /**
     * mousedown event handler
     */
    mousedownHandler(e) {
      // Prevent dragging / swiping on inputs, selects and textareas
      const ignoreSiema = ['TEXTAREA', 'OPTION', 'INPUT', 'SELECT'].indexOf(e.target.nodeName) !== -1;
      if (ignoreSiema) {
        return;
      }
  
      e.preventDefault();
      e.stopPropagation();
      this.pointerDown = true;
      this.drag.startX = e.pageX;

      this.stopAutoInterval()
    }
  
  
    /**
     * mouseup event handler
     */
    mouseupHandler(e) {
      e.stopPropagation();
      this.pointerDown = false;
      this.selector.style.cursor = '-webkit-grab';
      this.enableTransition();
      if (this.drag.endX) {
        this.updateAfterDrag();
      }
      this.clearDrag();
    }
  
    mouseenterHandler(e) {
      console.log("mouseenter")
      this.stopAutoInterval()
    }
  
    /**
     * mousemove event handler
     */
    mousemoveHandler(e) {
      e.preventDefault();
      if (this.pointerDown) {
        // if dragged element is a link
        // mark preventClick prop as a true
        // to detemine about browser redirection later on
        if (e.target.nodeName === 'A') {
          this.drag.preventClick = true;
        }
  
        this.drag.endX = e.pageX;
        this.selector.style.cursor = '-webkit-grabbing';
        this.sliderFrame.style.webkitTransition = `all 0ms ${this.config.easing}`;
        this.sliderFrame.style.transition = `all 0ms ${this.config.easing}`;
  
        const currentSlide = this.config.loop ? this.currentSlide + this.perPage : this.currentSlide;
        const currentOffset = currentSlide * (this.selectorWidth / this.perPage);
        const dragOffset = (this.drag.endX - this.drag.startX);
        const offset = this.config.rtl ? currentOffset + dragOffset : currentOffset - dragOffset;
        this.sliderFrame.style[this.transformProperty] = `translate3d(${(this.config.rtl ? 1 : -1) * offset}px, 0, 0)`;
      }
    }
  
  
    /**
     * mouseleave event handler
     */
    mouseleaveHandler(e) {
      if (this.pointerDown) {
        this.pointerDown = false;
        this.selector.style.cursor = '-webkit-grab';
        this.drag.endX = e.pageX;
        this.drag.preventClick = false;
        this.enableTransition();
        this.updateAfterDrag();
        this.clearDrag();
      }
      this.restartAutoInterval()
    }
  
  
    /**
     * click event handler
     */
    clickHandler(e) {
      // if the dragged element is a link
      // prevent browsers from folowing the link
      if (this.drag.preventClick) {
        e.preventDefault();
      }
      this.drag.preventClick = false;
    }

    get itemsToRender() {
        var items = []
        if (this.config.loop) {
            for(var i = this.numSlides - this.perPage; i < this.numSlides; i++) {
                items.push({key:`pre-${i}`, slide:this.component.input.slides[i]})
            }
        }
        for(var i = 0; i < this.numSlides; i++) {
                items.push({key:`item-${i}`, slide:this.component.input.slides[i]})
        }
        if (this.config.loop) {
            for(var i = 0; i < this.perPage; i++) {
                items.push({key:`post-${i}`, slide:this.component.input.slides[i]})
            }
        }
        return items
    }
  
  }

  const DEFAULT_OPTIONS = {
    duration: 200,
    easing: 'ease-out',
    perPage: 1,
    startIndex: 0,
    draggable: true,
    multipleDrag: true,
    threshold: 20,
    loop: false,
    rtl: false,
}

exports.Slider = Slider