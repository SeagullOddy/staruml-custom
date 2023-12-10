(function () {
    'use strict';

    function toString$2(obj) {
        if (!obj) {
            return obj
        }
        if (typeof obj === 'string') {
            return obj
        }
        return obj + '';
    }

    class ImageUtils {

        /**
         * Convert svg dataurl to canvas element
         * 
         * @private
         */
        async svg2canvas(svgDataURL, width, height) {
            const svgImage = await new Promise((resolve) => {
                var svgImage = new Image();
                svgImage.onload = function() {
                    resolve(svgImage);
                };
                svgImage.src = svgDataURL;
            });
            var canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(svgImage, 0, 0);
            return canvas;
        }
        
        toDataURL(svgNode, width, height, type, encoderOptions, options) {
            var xml = new XMLSerializer().serializeToString(svgNode);
        
            // documentMode is an IE-only property
            // http://msdn.microsoft.com/en-us/library/ie/cc196988(v=vs.85).aspx
            // http://stackoverflow.com/questions/10964966/detect-ie-version-prior-to-v9-in-javascript
            var isIE = document.documentMode;
        
            if (isIE) {
                // This is patch from canvas2svg
                // IE search for a duplicate xmnls because they didn't implement setAttributeNS correctly
                var xmlns = /xmlns="http:\/\/www\.w3\.org\/2000\/svg".+xmlns="http:\/\/www\.w3\.org\/2000\/svg/gi;
                if(xmlns.test(xml)) {
                    xml = xml.replace('xmlns="http://www.w3.org/2000/svg','xmlns:xlink="http://www.w3.org/1999/xlink');
                }
            }

            if (!options) {
                options = {};
            }
        
            var SVGDataURL = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
            if (type === "image/svg+xml" || !type) {
                if (options.async) {
                    return Promise.resolve(SVGDataURL)
                }
                return SVGDataURL;
            }
            if (type === "image/jpeg" || type === "image/png") {
                if (!options.async) {
                    throw new Error('svgcanvas: options.async must be set to true if type is image/jpeg | image/png')
                }
                return (async () => {
                    const canvas = await this.svg2canvas(SVGDataURL, width, height);
                    const dataUrl = canvas.toDataURL(type, encoderOptions);
                    canvas.remove();
                    return dataUrl;
                })()
            }
            throw new Error('svgcanvas: Unknown type for toDataURL, please use image/jpeg | image/png | image/svg+xml.');
        }

        getImageData(svgNode, width, height, sx, sy, sw, sh, options) {
            if (!options) {
                options = {};
            }
            if (!options.async) {
                throw new Error('svgcanvas: options.async must be set to true for getImageData')
            }
            const svgDataURL = this.toDataURL(svgNode, width, height, 'image/svg+xml');
            return (async () => {
                const canvas = await this.svg2canvas(svgDataURL, width, height);
                const ctx = canvas.getContext('2d');
                const imageData = ctx.getImageData(sx, sy, sw, sh);
                canvas.remove();
                return imageData;
            })()
        }
    }

    const utils$1 = new ImageUtils();

    /*!!
     *  SVGCanvas v2.0.3
     *  Draw on SVG using Canvas's 2D Context API.
     *
     *  Licensed under the MIT license:
     *  http://www.opensource.org/licenses/mit-license.php
     *
     *  Author:
     *  Kerry Liu
     *  Zeno Zeng
     *
     *  Copyright (c) 2014 Gliffy Inc.
     *  Copyright (c) 2021 Zeno Zeng
     */

    var Context = (function () {

        var STYLES, Context, CanvasGradient, CanvasPattern, namedEntities;

        //helper function to format a string
        function format(str, args) {
            var keys = Object.keys(args), i;
            for (i=0; i<keys.length; i++) {
                str = str.replace(new RegExp("\\{" + keys[i] + "\\}", "gi"), args[keys[i]]);
            }
            return str;
        }

        //helper function that generates a random string
        function randomString(holder) {
            var chars, randomstring, i;
            if (!holder) {
                throw new Error("cannot create a random attribute name for an undefined object");
            }
            chars = "ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
            randomstring = "";
            do {
                randomstring = "";
                for (i = 0; i < 12; i++) {
                    randomstring += chars[Math.floor(Math.random() * chars.length)];
                }
            } while (holder[randomstring]);
            return randomstring;
        }

        //helper function to map named to numbered entities
        function createNamedToNumberedLookup(items, radix) {
            var i, entity, lookup = {}, base10;
            items = items.split(',');
            radix = radix || 10;
            // Map from named to numbered entities.
            for (i = 0; i < items.length; i += 2) {
                entity = '&' + items[i + 1] + ';';
                base10 = parseInt(items[i], radix);
                lookup[entity] = '&#'+base10+';';
            }
            //FF and IE need to create a regex from hex values ie &nbsp; == \xa0
            lookup["\\xa0"] = '&#160;';
            return lookup;
        }

        //helper function to map canvas-textAlign to svg-textAnchor
        function getTextAnchor(textAlign) {
            //TODO: support rtl languages
            var mapping = {"left":"start", "right":"end", "center":"middle", "start":"start", "end":"end"};
            return mapping[textAlign] || mapping.start;
        }

        //helper function to map canvas-textBaseline to svg-dominantBaseline
        function getDominantBaseline(textBaseline) {
            //INFO: not supported in all browsers
            var mapping = {"alphabetic": "alphabetic", "hanging": "hanging", "top":"text-before-edge", "bottom":"text-after-edge", "middle":"central"};
            return mapping[textBaseline] || mapping.alphabetic;
        }

        // Unpack entities lookup where the numbers are in radix 32 to reduce the size
        // entity mapping courtesy of tinymce
        namedEntities = createNamedToNumberedLookup(
            '50,nbsp,51,iexcl,52,cent,53,pound,54,curren,55,yen,56,brvbar,57,sect,58,uml,59,copy,' +
                '5a,ordf,5b,laquo,5c,not,5d,shy,5e,reg,5f,macr,5g,deg,5h,plusmn,5i,sup2,5j,sup3,5k,acute,' +
                '5l,micro,5m,para,5n,middot,5o,cedil,5p,sup1,5q,ordm,5r,raquo,5s,frac14,5t,frac12,5u,frac34,' +
                '5v,iquest,60,Agrave,61,Aacute,62,Acirc,63,Atilde,64,Auml,65,Aring,66,AElig,67,Ccedil,' +
                '68,Egrave,69,Eacute,6a,Ecirc,6b,Euml,6c,Igrave,6d,Iacute,6e,Icirc,6f,Iuml,6g,ETH,6h,Ntilde,' +
                '6i,Ograve,6j,Oacute,6k,Ocirc,6l,Otilde,6m,Ouml,6n,times,6o,Oslash,6p,Ugrave,6q,Uacute,' +
                '6r,Ucirc,6s,Uuml,6t,Yacute,6u,THORN,6v,szlig,70,agrave,71,aacute,72,acirc,73,atilde,74,auml,' +
                '75,aring,76,aelig,77,ccedil,78,egrave,79,eacute,7a,ecirc,7b,euml,7c,igrave,7d,iacute,7e,icirc,' +
                '7f,iuml,7g,eth,7h,ntilde,7i,ograve,7j,oacute,7k,ocirc,7l,otilde,7m,ouml,7n,divide,7o,oslash,' +
                '7p,ugrave,7q,uacute,7r,ucirc,7s,uuml,7t,yacute,7u,thorn,7v,yuml,ci,fnof,sh,Alpha,si,Beta,' +
                'sj,Gamma,sk,Delta,sl,Epsilon,sm,Zeta,sn,Eta,so,Theta,sp,Iota,sq,Kappa,sr,Lambda,ss,Mu,' +
                'st,Nu,su,Xi,sv,Omicron,t0,Pi,t1,Rho,t3,Sigma,t4,Tau,t5,Upsilon,t6,Phi,t7,Chi,t8,Psi,' +
                't9,Omega,th,alpha,ti,beta,tj,gamma,tk,delta,tl,epsilon,tm,zeta,tn,eta,to,theta,tp,iota,' +
                'tq,kappa,tr,lambda,ts,mu,tt,nu,tu,xi,tv,omicron,u0,pi,u1,rho,u2,sigmaf,u3,sigma,u4,tau,' +
                'u5,upsilon,u6,phi,u7,chi,u8,psi,u9,omega,uh,thetasym,ui,upsih,um,piv,812,bull,816,hellip,' +
                '81i,prime,81j,Prime,81u,oline,824,frasl,88o,weierp,88h,image,88s,real,892,trade,89l,alefsym,' +
                '8cg,larr,8ch,uarr,8ci,rarr,8cj,darr,8ck,harr,8dl,crarr,8eg,lArr,8eh,uArr,8ei,rArr,8ej,dArr,' +
                '8ek,hArr,8g0,forall,8g2,part,8g3,exist,8g5,empty,8g7,nabla,8g8,isin,8g9,notin,8gb,ni,8gf,prod,' +
                '8gh,sum,8gi,minus,8gn,lowast,8gq,radic,8gt,prop,8gu,infin,8h0,ang,8h7,and,8h8,or,8h9,cap,8ha,cup,' +
                '8hb,int,8hk,there4,8hs,sim,8i5,cong,8i8,asymp,8j0,ne,8j1,equiv,8j4,le,8j5,ge,8k2,sub,8k3,sup,8k4,' +
                'nsub,8k6,sube,8k7,supe,8kl,oplus,8kn,otimes,8l5,perp,8m5,sdot,8o8,lceil,8o9,rceil,8oa,lfloor,8ob,' +
                'rfloor,8p9,lang,8pa,rang,9ea,loz,9j0,spades,9j3,clubs,9j5,hearts,9j6,diams,ai,OElig,aj,oelig,b0,' +
                'Scaron,b1,scaron,bo,Yuml,m6,circ,ms,tilde,802,ensp,803,emsp,809,thinsp,80c,zwnj,80d,zwj,80e,lrm,' +
                '80f,rlm,80j,ndash,80k,mdash,80o,lsquo,80p,rsquo,80q,sbquo,80s,ldquo,80t,rdquo,80u,bdquo,810,dagger,' +
                '811,Dagger,81g,permil,81p,lsaquo,81q,rsaquo,85c,euro', 32);


        //Some basic mappings for attributes and default values.
        STYLES = {
            "strokeStyle":{
                svgAttr : "stroke", //corresponding svg attribute
                canvas : "#000000", //canvas default
                svg : "none",       //svg default
                apply : "stroke"    //apply on stroke() or fill()
            },
            "fillStyle":{
                svgAttr : "fill",
                canvas : "#000000",
                svg : null, //svg default is black, but we need to special case this to handle canvas stroke without fill
                apply : "fill"
            },
            "lineCap":{
                svgAttr : "stroke-linecap",
                canvas : "butt",
                svg : "butt",
                apply : "stroke"
            },
            "lineJoin":{
                svgAttr : "stroke-linejoin",
                canvas : "miter",
                svg : "miter",
                apply : "stroke"
            },
            "miterLimit":{
                svgAttr : "stroke-miterlimit",
                canvas : 10,
                svg : 4,
                apply : "stroke"
            },
            "lineWidth":{
                svgAttr : "stroke-width",
                canvas : 1,
                svg : 1,
                apply : "stroke"
            },
            "globalAlpha": {
                svgAttr : "opacity",
                canvas : 1,
                svg : 1,
                apply :  "fill stroke"
            },
            "font":{
                //font converts to multiple svg attributes, there is custom logic for this
                canvas : "10px sans-serif"
            },
            "shadowColor":{
                canvas : "#000000"
            },
            "shadowOffsetX":{
                canvas : 0
            },
            "shadowOffsetY":{
                canvas : 0
            },
            "shadowBlur":{
                canvas : 0
            },
            "textAlign":{
                canvas : "start"
            },
            "textBaseline":{
                canvas : "alphabetic"
            },
            "lineDash" : {
                svgAttr : "stroke-dasharray",
                canvas : [],
                svg : null,
                apply : "stroke"
            }
        };

        /**
         *
         * @param gradientNode - reference to the gradient
         * @constructor
         */
        CanvasGradient = function (gradientNode, ctx) {
            this.__root = gradientNode;
            this.__ctx = ctx;
        };

        /**
         * Adds a color stop to the gradient root
         */
        CanvasGradient.prototype.addColorStop = function (offset, color) {
            var stop = this.__ctx.__createElement("stop"), regex, matches;
            stop.setAttribute("offset", offset);
            if (toString$2(color).indexOf("rgba") !== -1) {
                //separate alpha value, since webkit can't handle it
                regex = /rgba\(\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\s*,\s*(\d?\.?\d*)\s*\)/gi;
                matches = regex.exec(color);
                stop.setAttribute("stop-color", format("rgb({r},{g},{b})", {r:matches[1], g:matches[2], b:matches[3]}));
                stop.setAttribute("stop-opacity", matches[4]);
            } else {
                stop.setAttribute("stop-color", toString$2(color));
            }
            this.__root.appendChild(stop);
        };

        CanvasPattern = function (pattern, ctx) {
            this.__root = pattern;
            this.__ctx = ctx;
        };

        /**
         * The mock canvas context
         * @param o - options include:
         * ctx - existing Context2D to wrap around
         * width - width of your canvas (defaults to 500)
         * height - height of your canvas (defaults to 500)
         * enableMirroring - enables canvas mirroring (get image data) (defaults to false)
         * document - the document object (defaults to the current document)
         */
        Context = function (o) {

            var defaultOptions = { width:500, height:500, enableMirroring : false}, options;

            // keep support for this way of calling Context: new Context(width, height)
            if (arguments.length > 1) {
                options = defaultOptions;
                options.width = arguments[0];
                options.height = arguments[1];
            } else if ( !o ) {
                options = defaultOptions;
            } else {
                options = o;
            }

            if (!(this instanceof Context)) {
                //did someone call this without new?
                return new Context(options);
            }

            //setup options
            this.width = options.width || defaultOptions.width;
            this.height = options.height || defaultOptions.height;
            this.enableMirroring = options.enableMirroring !== undefined ? options.enableMirroring : defaultOptions.enableMirroring;

            this.canvas = this;   ///point back to this instance!
            this.__document = options.document || document;

            // allow passing in an existing context to wrap around
            // if a context is passed in, we know a canvas already exist
            if (options.ctx) {
                this.__ctx = options.ctx;
            } else {
                this.__canvas = this.__document.createElement("canvas");
                this.__ctx = this.__canvas.getContext("2d");
            }

            this.__setDefaultStyles();
            this.__styleStack = [this.__getStyleState()];
            this.__groupStack = [];

            //the root svg element
            this.__root = this.__document.createElementNS("http://www.w3.org/2000/svg", "svg");
            this.__root.setAttribute("version", 1.1);
            this.__root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
            this.__root.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
            this.__root.setAttribute("width", this.width);
            this.__root.setAttribute("height", this.height);

            //make sure we don't generate the same ids in defs
            this.__ids = {};

            //defs tag
            this.__defs = this.__document.createElementNS("http://www.w3.org/2000/svg", "defs");
            this.__root.appendChild(this.__defs);

            //also add a group child. the svg element can't use the transform attribute
            this.__currentElement = this.__document.createElementNS("http://www.w3.org/2000/svg", "g");
            this.__root.appendChild(this.__currentElement);

            // init transformation matrix
            this.resetTransform();

            this.__options = options;
            this.__id = Math.random().toString(16).substring(2, 8);
            this.__debug(`new`, o);
        };

        /**
         * Log
         *
         * @private
         */
        Context.prototype.__debug = function(...data) {
            if (!this.__options.debug) {
                return
            }
            console.debug(`svgcanvas#${this.__id}:`, ...data);
        };

        /**
         * Creates the specified svg element
         * @private
         */
        Context.prototype.__createElement = function (elementName, properties, resetFill) {
            if (typeof properties === "undefined") {
                properties = {};
            }

            var element = this.__document.createElementNS("http://www.w3.org/2000/svg", elementName),
                keys = Object.keys(properties), i, key;
            if (resetFill) {
                //if fill or stroke is not specified, the svg element should not display. By default SVG's fill is black.
                element.setAttribute("fill", "none");
                element.setAttribute("stroke", "none");
            }
            for (i=0; i<keys.length; i++) {
                key = keys[i];
                element.setAttribute(key, properties[key]);
            }
            return element;
        };

        /**
         * Applies default canvas styles to the context
         * @private
         */
        Context.prototype.__setDefaultStyles = function () {
            //default 2d canvas context properties see:http://www.w3.org/TR/2dcontext/
            var keys = Object.keys(STYLES), i, key;
            for (i=0; i<keys.length; i++) {
                key = keys[i];
                this[key] = STYLES[key].canvas;
            }
        };

        /**
         * Applies styles on restore
         * @param styleState
         * @private
         */
        Context.prototype.__applyStyleState = function (styleState) {
            var keys = Object.keys(styleState), i, key;
            for (i=0; i<keys.length; i++) {
                key = keys[i];
                this[key] = styleState[key];
            }
        };

        /**
         * Gets the current style state
         * @return {Object}
         * @private
         */
        Context.prototype.__getStyleState = function () {
            var i, styleState = {}, keys = Object.keys(STYLES), key;
            for (i=0; i<keys.length; i++) {
                key = keys[i];
                styleState[key] = this[key];
            }
            return styleState;
        };

        /**
         * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/transform
         */
        Context.prototype.__applyTransformation = function (element, matrix) {
            const {a, b, c, d, e, f} = matrix || this.getTransform();
            element.setAttribute('transform', `matrix(${a} ${b} ${c} ${d} ${e} ${f})`);
        };

        /**
         * Apples the current styles to the current SVG element. On "ctx.fill" or "ctx.stroke"
         * @param type
         * @private
         */
        Context.prototype.__applyStyleToCurrentElement = function (type) {
            var currentElement = this.__currentElement;
            var currentStyleGroup = this.__currentElementsToStyle;
            if (currentStyleGroup) {
                currentElement.setAttribute(type, "");
                currentElement = currentStyleGroup.element;
                currentStyleGroup.children.forEach(function (node) {
                    node.setAttribute(type, "");
                });
            }

            var keys = Object.keys(STYLES), i, style, value, regex, matches, id, nodeIndex, node;
            for (i = 0; i < keys.length; i++) {
                style = STYLES[keys[i]];
                value = this[keys[i]];
                if (style.apply) {
                    //is this a gradient or pattern?
                    if (value instanceof CanvasPattern) {
                        //pattern
                        if (value.__ctx) {
                            //copy over defs
                            for(nodeIndex = 0; nodeIndex < value.__ctx.__defs.childNodes.length; nodeIndex++){
                              node = value.__ctx.__defs.childNodes[nodeIndex];
                              id = node.getAttribute("id");
                              this.__ids[id] = id;
                              this.__defs.appendChild(node);
                            }
                        }
                        currentElement.setAttribute(style.apply, format("url(#{id})", {id:value.__root.getAttribute("id")}));
                    }
                    else if (value instanceof CanvasGradient) {
                        //gradient
                        currentElement.setAttribute(style.apply, format("url(#{id})", {id:value.__root.getAttribute("id")}));
                    } else if (style.apply.indexOf(type)!==-1 && style.svg !== value) {
                        if ((style.svgAttr === "stroke" || style.svgAttr === "fill") && value.indexOf("rgba") !== -1) {
                            //separate alpha value, since illustrator can't handle it
                            regex = /rgba\(\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\s*,\s*(\d?\.?\d*)\s*\)/gi;
                            matches = regex.exec(value);
                            currentElement.setAttribute(style.svgAttr, format("rgb({r},{g},{b})", {r:matches[1], g:matches[2], b:matches[3]}));
                            //should take globalAlpha here
                            var opacity = matches[4];
                            var globalAlpha = this.globalAlpha;
                            if (globalAlpha != null) {
                                opacity *= globalAlpha;
                            }
                            currentElement.setAttribute(style.svgAttr+"-opacity", opacity);
                        } else {
                            var attr = style.svgAttr;
                            if (keys[i] === 'globalAlpha') {
                                attr = type+'-'+style.svgAttr;
                                if (currentElement.getAttribute(attr)) {
                                     //fill-opacity or stroke-opacity has already been set by stroke or fill.
                                    continue;
                                }
                            } else if (keys[i] === 'lineWidth') {
                                var scale = this.__getTransformScale();
                                value = value * Math.max(scale.x, scale.y);
                            }
                            //otherwise only update attribute if right type, and not svg default
                            currentElement.setAttribute(attr, value);
                        }
                    }
                }
            }
        };

        /**
         * Will return the closest group or svg node. May return the current element.
         * @private
         */
        Context.prototype.__closestGroupOrSvg = function (node) {
            node = node || this.__currentElement;
            if (node.nodeName === "g" || node.nodeName === "svg") {
                return node;
            } else {
                return this.__closestGroupOrSvg(node.parentNode);
            }
        };

        /**
         * Returns the serialized value of the svg so far
         * @param fixNamedEntities - Standalone SVG doesn't support named entities, which document.createTextNode encodes.
         *                           If true, we attempt to find all named entities and encode it as a numeric entity.
         * @return serialized svg
         */
        Context.prototype.getSerializedSvg = function (fixNamedEntities) {
            var serialized = new XMLSerializer().serializeToString(this.__root),
                keys, i, key, value, regexp, xmlns;

            //IE search for a duplicate xmnls because they didn't implement setAttributeNS correctly
            xmlns = /xmlns="http:\/\/www\.w3\.org\/2000\/svg".+xmlns="http:\/\/www\.w3\.org\/2000\/svg/gi;
            if (xmlns.test(serialized)) {
                serialized = serialized.replace('xmlns="http://www.w3.org/2000/svg','xmlns:xlink="http://www.w3.org/1999/xlink');
            }

            if (fixNamedEntities) {
                keys = Object.keys(namedEntities);
                //loop over each named entity and replace with the proper equivalent.
                for (i=0; i<keys.length; i++) {
                    key = keys[i];
                    value = namedEntities[key];
                    regexp = new RegExp(key, "gi");
                    if (regexp.test(serialized)) {
                        serialized = serialized.replace(regexp, value);
                    }
                }
            }

            return serialized;
        };


        /**
         * Returns the root svg
         * @return
         */
        Context.prototype.getSvg = function () {
            return this.__root;
        };

        /**
         * Will generate a group tag.
         */
        Context.prototype.save = function () {
            var group = this.__createElement("g");
            var parent = this.__closestGroupOrSvg();
            this.__groupStack.push(parent);
            parent.appendChild(group);
            this.__currentElement = group;
            const style = this.__getStyleState();

            this.__debug('save style', style);
            this.__styleStack.push(style);
            if (!this.__transformMatrixStack) {
                this.__transformMatrixStack = [];
            }
            this.__transformMatrixStack.push(this.getTransform());
        };

        /**
         * Sets current element to parent, or just root if already root
         */
        Context.prototype.restore = function () {
            this.__currentElement = this.__groupStack.pop();
            this.__currentElementsToStyle = null;
            //Clearing canvas will make the poped group invalid, currentElement is set to the root group node.
            if (!this.__currentElement) {
                this.__currentElement = this.__root.childNodes[1];
            }
            var state = this.__styleStack.pop();
            this.__debug('restore style', state);
            this.__applyStyleState(state);
            if (this.__transformMatrixStack && this.__transformMatrixStack.length > 0) {
                this.setTransform(this.__transformMatrixStack.pop());
            }

        };

        /**
         * Create a new Path Element
         */
        Context.prototype.beginPath = function () {
            var path, parent;

            // Note that there is only one current default path, it is not part of the drawing state.
            // See also: https://html.spec.whatwg.org/multipage/scripting.html#current-default-path
            this.__currentDefaultPath = "";
            this.__currentPosition = {};

            path = this.__createElement("path", {}, true);
            parent = this.__closestGroupOrSvg();
            parent.appendChild(path);
            this.__currentElement = path;
        };

        /**
         * Helper function to apply currentDefaultPath to current path element
         * @private
         */
        Context.prototype.__applyCurrentDefaultPath = function () {
            var currentElement = this.__currentElement;
            if (currentElement.nodeName === "path") {
                currentElement.setAttribute("d", this.__currentDefaultPath);
            } else {
                console.error("Attempted to apply path command to node", currentElement.nodeName);
            }
        };

        /**
         * Helper function to add path command
         * @private
         */
        Context.prototype.__addPathCommand = function (command) {
            this.__currentDefaultPath += " ";
            this.__currentDefaultPath += command;
        };

        /**
         * Adds the move command to the current path element,
         * if the currentPathElement is not empty create a new path element
         */
        Context.prototype.moveTo = function (x,y) {
            if (this.__currentElement.nodeName !== "path") {
                this.beginPath();
            }

            // creates a new subpath with the given point
            this.__currentPosition = {x: x, y: y};
            this.__addPathCommand(format("M {x} {y}", {
                x: this.__matrixTransform(x, y).x,
                y: this.__matrixTransform(x, y).y
            }));
        };

        /**
         * Closes the current path
         */
        Context.prototype.closePath = function () {
            if (this.__currentDefaultPath) {
                this.__addPathCommand("Z");
            }
        };

        /**
         * Adds a line to command
         */
        Context.prototype.lineTo = function (x, y) {
            this.__currentPosition = {x: x, y: y};
            if (this.__currentDefaultPath.indexOf('M') > -1) {
                this.__addPathCommand(format("L {x} {y}", {
                    x: this.__matrixTransform(x, y).x,
                    y: this.__matrixTransform(x, y).y
                }));
            } else {
                this.__addPathCommand(format("M {x} {y}", {
                    x: this.__matrixTransform(x, y).x,
                    y: this.__matrixTransform(x, y).y
                }));
            }
        };

        /**
         * Add a bezier command
         */
        Context.prototype.bezierCurveTo = function (cp1x, cp1y, cp2x, cp2y, x, y) {
            this.__currentPosition = {x: x, y: y};
            this.__addPathCommand(format("C {cp1x} {cp1y} {cp2x} {cp2y} {x} {y}",
                {
                    cp1x: this.__matrixTransform(cp1x, cp1y).x,
                    cp1y: this.__matrixTransform(cp1x, cp1y).y,
                    cp2x: this.__matrixTransform(cp2x, cp2y).x,
                    cp2y: this.__matrixTransform(cp2x, cp2y).y,
                    x: this.__matrixTransform(x, y).x,
                    y: this.__matrixTransform(x, y).y
                }));
        };

        /**
         * Adds a quadratic curve to command
         */
        Context.prototype.quadraticCurveTo = function (cpx, cpy, x, y) {
            this.__currentPosition = {x: x, y: y};
            this.__addPathCommand(format("Q {cpx} {cpy} {x} {y}", {
                cpx: this.__matrixTransform(cpx, cpy).x,
                cpy: this.__matrixTransform(cpx, cpy).y,
                x: this.__matrixTransform(x, y).x,
                y: this.__matrixTransform(x, y).y
            }));
        };


        /**
         * Return a new normalized vector of given vector
         */
        var normalize = function (vector) {
            var len = Math.sqrt(vector[0] * vector[0] + vector[1] * vector[1]);
            return [vector[0] / len, vector[1] / len];
        };

        /**
         * Adds the arcTo to the current path
         *
         * @see http://www.w3.org/TR/2015/WD-2dcontext-20150514/#dom-context-2d-arcto
         */
        Context.prototype.arcTo = function (x1, y1, x2, y2, radius) {
            // Let the point (x0, y0) be the last point in the subpath.
            var x0 = this.__currentPosition && this.__currentPosition.x;
            var y0 = this.__currentPosition && this.__currentPosition.y;

            // First ensure there is a subpath for (x1, y1).
            if (typeof x0 == "undefined" || typeof y0 == "undefined") {
                return;
            }

            // Negative values for radius must cause the implementation to throw an IndexSizeError exception.
            if (radius < 0) {
                throw new Error("IndexSizeError: The radius provided (" + radius + ") is negative.");
            }

            // If the point (x0, y0) is equal to the point (x1, y1),
            // or if the point (x1, y1) is equal to the point (x2, y2),
            // or if the radius radius is zero,
            // then the method must add the point (x1, y1) to the subpath,
            // and connect that point to the previous point (x0, y0) by a straight line.
            if (((x0 === x1) && (y0 === y1))
                || ((x1 === x2) && (y1 === y2))
                || (radius === 0)) {
                this.lineTo(x1, y1);
                return;
            }

            // Otherwise, if the points (x0, y0), (x1, y1), and (x2, y2) all lie on a single straight line,
            // then the method must add the point (x1, y1) to the subpath,
            // and connect that point to the previous point (x0, y0) by a straight line.
            var unit_vec_p1_p0 = normalize([x0 - x1, y0 - y1]);
            var unit_vec_p1_p2 = normalize([x2 - x1, y2 - y1]);
            if (unit_vec_p1_p0[0] * unit_vec_p1_p2[1] === unit_vec_p1_p0[1] * unit_vec_p1_p2[0]) {
                this.lineTo(x1, y1);
                return;
            }

            // Otherwise, let The Arc be the shortest arc given by circumference of the circle that has radius radius,
            // and that has one point tangent to the half-infinite line that crosses the point (x0, y0) and ends at the point (x1, y1),
            // and that has a different point tangent to the half-infinite line that ends at the point (x1, y1), and crosses the point (x2, y2).
            // The points at which this circle touches these two lines are called the start and end tangent points respectively.

            // note that both vectors are unit vectors, so the length is 1
            var cos = (unit_vec_p1_p0[0] * unit_vec_p1_p2[0] + unit_vec_p1_p0[1] * unit_vec_p1_p2[1]);
            var theta = Math.acos(Math.abs(cos));

            // Calculate origin
            var unit_vec_p1_origin = normalize([
                unit_vec_p1_p0[0] + unit_vec_p1_p2[0],
                unit_vec_p1_p0[1] + unit_vec_p1_p2[1]
            ]);
            var len_p1_origin = radius / Math.sin(theta / 2);
            var x = x1 + len_p1_origin * unit_vec_p1_origin[0];
            var y = y1 + len_p1_origin * unit_vec_p1_origin[1];

            // Calculate start angle and end angle
            // rotate 90deg clockwise (note that y axis points to its down)
            var unit_vec_origin_start_tangent = [
                -unit_vec_p1_p0[1],
                unit_vec_p1_p0[0]
            ];
            // rotate 90deg counter clockwise (note that y axis points to its down)
            var unit_vec_origin_end_tangent = [
                unit_vec_p1_p2[1],
                -unit_vec_p1_p2[0]
            ];
            var getAngle = function (vector) {
                // get angle (clockwise) between vector and (1, 0)
                var x = vector[0];
                var y = vector[1];
                if (y >= 0) { // note that y axis points to its down
                    return Math.acos(x);
                } else {
                    return -Math.acos(x);
                }
            };
            var startAngle = getAngle(unit_vec_origin_start_tangent);
            var endAngle = getAngle(unit_vec_origin_end_tangent);

            // Connect the point (x0, y0) to the start tangent point by a straight line
            this.lineTo(x + unit_vec_origin_start_tangent[0] * radius,
                        y + unit_vec_origin_start_tangent[1] * radius);

            // Connect the start tangent point to the end tangent point by arc
            // and adding the end tangent point to the subpath.
            this.arc(x, y, radius, startAngle, endAngle);
        };

        /**
         * Sets the stroke property on the current element
         */
        Context.prototype.stroke = function () {
            if (this.__currentElement.nodeName === "path") {
                this.__currentElement.setAttribute("paint-order", "fill stroke markers");
            }
            this.__applyCurrentDefaultPath();
            this.__applyStyleToCurrentElement("stroke");
        };

        /**
         * Sets fill properties on the current element
         */
        Context.prototype.fill = function () {
            if (this.__currentElement.nodeName === "path") {
                this.__currentElement.setAttribute("paint-order", "stroke fill markers");
            }
            this.__applyCurrentDefaultPath();
            this.__applyStyleToCurrentElement("fill");
        };

        /**
         *  Adds a rectangle to the path.
         */
        Context.prototype.rect = function (x, y, width, height) {
            if (this.__currentElement.nodeName !== "path") {
                this.beginPath();
            }
            this.moveTo(x, y);
            this.lineTo(x+width, y);
            this.lineTo(x+width, y+height);
            this.lineTo(x, y+height);
            this.lineTo(x, y);
            this.closePath();
        };


        /**
         * adds a rectangle element
         */
        Context.prototype.fillRect = function (x, y, width, height) {
            let {a, b, c, d, e, f} = this.getTransform();
            if (JSON.stringify([a, b, c, d, e, f]) === JSON.stringify([1, 0, 0, 1, 0, 0])) {
                //clear entire canvas
                if (x === 0 && y === 0 && width === this.width && height === this.height) {
                    this.__clearCanvas();
                }
            }
            var rect, parent;
            rect = this.__createElement("rect", {
                x : x,
                y : y,
                width : width,
                height : height
            }, true);
            parent = this.__closestGroupOrSvg();
            parent.appendChild(rect);
            this.__currentElement = rect;
            this.__applyTransformation(rect);
            this.__applyStyleToCurrentElement("fill");
        };

        /**
         * Draws a rectangle with no fill
         * @param x
         * @param y
         * @param width
         * @param height
         */
        Context.prototype.strokeRect = function (x, y, width, height) {
            var rect, parent;
            rect = this.__createElement("rect", {
                x : x,
                y : y,
                width : width,
                height : height
            }, true);
            parent = this.__closestGroupOrSvg();
            parent.appendChild(rect);
            this.__currentElement = rect;
            this.__applyTransformation(rect);
            this.__applyStyleToCurrentElement("stroke");
        };


        /**
         * Clear entire canvas:
         * 1. save current transforms
         * 2. remove all the childNodes of the root g element
         */
        Context.prototype.__clearCanvas = function () {
            var rootGroup = this.__root.childNodes[1];
            this.__root.removeChild(rootGroup);
            this.__currentElement = this.__document.createElementNS("http://www.w3.org/2000/svg", "g");
            this.__root.appendChild(this.__currentElement);
            //reset __groupStack as all the child group nodes are all removed.
            this.__groupStack = [];
        };

        /**
         * "Clears" a canvas by just drawing a white rectangle in the current group.
         */
        Context.prototype.clearRect = function (x, y, width, height) {
            let {a, b, c, d, e, f} = this.getTransform();
            if (JSON.stringify([a, b, c, d, e, f]) === JSON.stringify([1, 0, 0, 1, 0, 0])) {
                //clear entire canvas
                if (x === 0 && y === 0 && width === this.width && height === this.height) {
                    this.__clearCanvas();
                    return;
                }
            }
            var rect, parent = this.__closestGroupOrSvg();
            rect = this.__createElement("rect", {
                x : x,
                y : y,
                width : width,
                height : height,
                fill : "#FFFFFF"
            }, true);
            this.__applyTransformation(rect);
            parent.appendChild(rect);
        };

        /**
         * Adds a linear gradient to a defs tag.
         * Returns a canvas gradient object that has a reference to it's parent def
         */
        Context.prototype.createLinearGradient = function (x1, y1, x2, y2) {
            var grad = this.__createElement("linearGradient", {
                id : randomString(this.__ids),
                x1 : x1+"px",
                x2 : x2+"px",
                y1 : y1+"px",
                y2 : y2+"px",
                "gradientUnits" : "userSpaceOnUse"
            }, false);
            this.__defs.appendChild(grad);
            return new CanvasGradient(grad, this);
        };

        /**
         * Adds a radial gradient to a defs tag.
         * Returns a canvas gradient object that has a reference to it's parent def
         */
        Context.prototype.createRadialGradient = function (x0, y0, r0, x1, y1, r1) {
            var grad = this.__createElement("radialGradient", {
                id : randomString(this.__ids),
                cx : x1+"px",
                cy : y1+"px",
                r  : r1+"px",
                fx : x0+"px",
                fy : y0+"px",
                "gradientUnits" : "userSpaceOnUse"
            }, false);
            this.__defs.appendChild(grad);
            return new CanvasGradient(grad, this);

        };

        /**
         * Fills or strokes text
         * @param text
         * @param x
         * @param y
         * @param action - stroke or fill
         * @private
         */
        Context.prototype.__applyText = function (text, x, y, action) {
            var el = document.createElement("span");
            el.setAttribute("style", 'font:' + this.font);

            var style = el.style, // CSSStyleDeclaration object
                parent = this.__closestGroupOrSvg(),
                textElement = this.__createElement("text", {
                    "font-family": style.fontFamily,
                    "font-size": style.fontSize,
                    "font-style": style.fontStyle,
                    "font-weight": style.fontWeight,

                    // canvas doesn't support underline natively, but we do :)
                    "text-decoration": this.__fontUnderline,
                    "x": x,
                    "y": y,
                    "text-anchor": getTextAnchor(this.textAlign),
                    "dominant-baseline": getDominantBaseline(this.textBaseline)
                }, true);

            textElement.appendChild(this.__document.createTextNode(text));
            this.__currentElement = textElement;
            this.__applyTransformation(textElement);
            this.__applyStyleToCurrentElement(action);

            if (this.__fontHref) {
                var a = this.__createElement("a");
                // canvas doesn't natively support linking, but we do :)
                a.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", this.__fontHref);
                a.appendChild(textElement);
                textElement = a;
            }

            parent.appendChild(textElement);
        };

        /**
         * Creates a text element
         * @param text
         * @param x
         * @param y
         */
        Context.prototype.fillText = function (text, x, y) {
            this.__applyText(text, x, y, "fill");
        };

        /**
         * Strokes text
         * @param text
         * @param x
         * @param y
         */
        Context.prototype.strokeText = function (text, x, y) {
            this.__applyText(text, x, y, "stroke");
        };

        /**
         * No need to implement this for svg.
         * @param text
         * @return {TextMetrics}
         */
        Context.prototype.measureText = function (text) {
            this.__ctx.font = this.font;
            return this.__ctx.measureText(text);
        };

        /**
         *  Arc command!
         */
        Context.prototype.arc = function (x, y, radius, startAngle, endAngle, counterClockwise) {
            // in canvas no circle is drawn if no angle is provided.
            if (startAngle === endAngle) {
                return;
            }
            startAngle = startAngle % (2*Math.PI);
            endAngle = endAngle % (2*Math.PI);
            if (startAngle === endAngle) {
                //circle time! subtract some of the angle so svg is happy (svg elliptical arc can't draw a full circle)
                endAngle = ((endAngle + (2*Math.PI)) - 0.001 * (counterClockwise ? -1 : 1)) % (2*Math.PI);
            }
            var endX = x+radius*Math.cos(endAngle),
                endY = y+radius*Math.sin(endAngle),
                startX = x+radius*Math.cos(startAngle),
                startY = y+radius*Math.sin(startAngle),
                sweepFlag = counterClockwise ? 0 : 1,
                largeArcFlag = 0,
                diff = endAngle - startAngle;

            // https://github.com/gliffy/canvas2svg/issues/4
            if (diff < 0) {
                diff += 2*Math.PI;
            }

            if (counterClockwise) {
                largeArcFlag = diff > Math.PI ? 0 : 1;
            } else {
                largeArcFlag = diff > Math.PI ? 1 : 0;
            }

            var scaleX = Math.hypot(this.__transformMatrix.a, this.__transformMatrix.b);
            var scaleY = Math.hypot(this.__transformMatrix.c, this.__transformMatrix.d);

            this.lineTo(startX, startY);
            this.__addPathCommand(format("A {rx} {ry} {xAxisRotation} {largeArcFlag} {sweepFlag} {endX} {endY}",
                {
                    rx:radius * scaleX,
                    ry:radius * scaleY,
                    xAxisRotation:0,
                    largeArcFlag:largeArcFlag,
                    sweepFlag:sweepFlag,
                    endX: this.__matrixTransform(endX, endY).x,
                    endY: this.__matrixTransform(endX, endY).y
                }));

            this.__currentPosition = {x: endX, y: endY};
        };

        /**
         *  Ellipse command!
         */
         Context.prototype.ellipse = function(x, y, radiusX, radiusY, rotation, startAngle, endAngle, counterClockwise) {
            if (startAngle === endAngle) {
                return;
            }

            var transformedCenter = this.__matrixTransform(x, y);
            x = transformedCenter.x;
            y = transformedCenter.y;
            var scale = this.__getTransformScale();
            radiusX = radiusX * scale.x;
            radiusY = radiusY * scale.y;
            rotation = rotation + this.__getTransformRotation();

            startAngle = startAngle % (2*Math.PI);
            endAngle = endAngle % (2*Math.PI);
            if(startAngle === endAngle) {
                endAngle = ((endAngle + (2*Math.PI)) - 0.001 * (counterClockwise ? -1 : 1)) % (2*Math.PI);
            }
            var endX = x + Math.cos(-rotation) * radiusX * Math.cos(endAngle)
                         + Math.sin(-rotation) * radiusY * Math.sin(endAngle),
                endY = y - Math.sin(-rotation) * radiusX * Math.cos(endAngle)
                         + Math.cos(-rotation) * radiusY * Math.sin(endAngle),
                startX = x + Math.cos(-rotation) * radiusX * Math.cos(startAngle)
                           + Math.sin(-rotation) * radiusY * Math.sin(startAngle),
                startY = y - Math.sin(-rotation) * radiusX * Math.cos(startAngle)
                           + Math.cos(-rotation) * radiusY * Math.sin(startAngle),
                sweepFlag = counterClockwise ? 0 : 1,
                largeArcFlag = 0,
                diff = endAngle - startAngle;

            if(diff < 0) {
                diff += 2*Math.PI;
            }

            if(counterClockwise) {
                largeArcFlag = diff > Math.PI ? 0 : 1;
            } else {
                largeArcFlag = diff > Math.PI ? 1 : 0;
            }

            // Transform is already applied, so temporarily remove since lineTo
            // will apply it again.
            var currentTransform = this.__transformMatrix;
            this.resetTransform();
            this.lineTo(startX, startY);
            this.__transformMatrix = currentTransform;

            this.__addPathCommand(format("A {rx} {ry} {xAxisRotation} {largeArcFlag} {sweepFlag} {endX} {endY}",
                {
                    rx:radiusX, 
                    ry:radiusY, 
                    xAxisRotation:rotation*(180/Math.PI), 
                    largeArcFlag:largeArcFlag, 
                    sweepFlag:sweepFlag, 
                    endX:endX,
                    endY:endY
                }));

            this.__currentPosition = {x: endX, y: endY};
        };

        /**
         * Generates a ClipPath from the clip command.
         */
        Context.prototype.clip = function () {
            var group = this.__closestGroupOrSvg(),
                clipPath = this.__createElement("clipPath"),
                id =  randomString(this.__ids),
                newGroup = this.__createElement("g");

            this.__applyCurrentDefaultPath();
            group.removeChild(this.__currentElement);
            clipPath.setAttribute("id", id);
            clipPath.appendChild(this.__currentElement);

            this.__defs.appendChild(clipPath);

            //set the clip path to this group
            group.setAttribute("clip-path", format("url(#{id})", {id:id}));

            //clip paths can be scaled and transformed, we need to add another wrapper group to avoid later transformations
            // to this path
            group.appendChild(newGroup);

            this.__currentElement = newGroup;

        };

        /**
         * Draws a canvas, image or mock context to this canvas.
         * Note that all svg dom manipulation uses node.childNodes rather than node.children for IE support.
         * http://www.whatwg.org/specs/web-apps/current-work/multipage/the-canvas-element.html#dom-context-2d-drawimage
         */
        Context.prototype.drawImage = function () {
            //convert arguments to a real array
            var args = Array.prototype.slice.call(arguments),
                image=args[0],
                dx, dy, dw, dh, sx=0, sy=0, sw, sh, parent, svg, defs, group,
                svgImage, canvas, context, id;

            if (args.length === 3) {
                dx = args[1];
                dy = args[2];
                sw = image.width;
                sh = image.height;
                dw = sw;
                dh = sh;
            } else if (args.length === 5) {
                dx = args[1];
                dy = args[2];
                dw = args[3];
                dh = args[4];
                sw = image.width;
                sh = image.height;
            } else if (args.length === 9) {
                sx = args[1];
                sy = args[2];
                sw = args[3];
                sh = args[4];
                dx = args[5];
                dy = args[6];
                dw = args[7];
                dh = args[8];
            } else {
                throw new Error("Invalid number of arguments passed to drawImage: " + arguments.length);
            }

            parent = this.__closestGroupOrSvg();
            const matrix = this.getTransform().translate(dx, dy);
            if (image instanceof Context) {
                //canvas2svg mock canvas context. In the future we may want to clone nodes instead.
                //also I'm currently ignoring dw, dh, sw, sh, sx, sy for a mock context.
                svg = image.getSvg().cloneNode(true);
                if (svg.childNodes && svg.childNodes.length > 1) {
                    defs = svg.childNodes[0];
                    while(defs.childNodes.length) {
                        id = defs.childNodes[0].getAttribute("id");
                        this.__ids[id] = id;
                        this.__defs.appendChild(defs.childNodes[0]);
                    }
                    group = svg.childNodes[1];
                    if (group) {
                        this.__applyTransformation(group, matrix);
                        parent.appendChild(group);
                    }
                }
            } else if (image.nodeName === "CANVAS" || image.nodeName === "IMG") {
                //canvas or image
                svgImage = this.__createElement("image");
                svgImage.setAttribute("width", dw);
                svgImage.setAttribute("height", dh);
                svgImage.setAttribute("preserveAspectRatio", "none");

                if (sx || sy || sw !== image.width || sh !== image.height) {
                    //crop the image using a temporary canvas
                    canvas = this.__document.createElement("canvas");
                    canvas.width = dw;
                    canvas.height = dh;
                    context = canvas.getContext("2d");
                    context.drawImage(image, sx, sy, sw, sh, 0, 0, dw, dh);
                    image = canvas;
                }
                this.__applyTransformation(svgImage, matrix);
                svgImage.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href",
                    image.nodeName === "CANVAS" ? image.toDataURL() : image.getAttribute("src"));
                parent.appendChild(svgImage);
            }
        };

        /**
         * Generates a pattern tag
         */
        Context.prototype.createPattern = function (image, repetition) {
            var pattern = this.__document.createElementNS("http://www.w3.org/2000/svg", "pattern"), id = randomString(this.__ids),
                img;
            pattern.setAttribute("id", id);
            pattern.setAttribute("width", image.width);
            pattern.setAttribute("height", image.height);
            // We want the pattern sizing to be absolute, and not relative
            // https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Patterns
            // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/patternUnits
            pattern.setAttribute("patternUnits", "userSpaceOnUse");

            if (image.nodeName === "CANVAS" || image.nodeName === "IMG") {
                img = this.__document.createElementNS("http://www.w3.org/2000/svg", "image");
                img.setAttribute("width", image.width);
                img.setAttribute("height", image.height);
                img.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href",
                    image.nodeName === "CANVAS" ? image.toDataURL() : image.getAttribute("src"));
                pattern.appendChild(img);
                this.__defs.appendChild(pattern);
            } else if (image instanceof Context) {
                pattern.appendChild(image.__root.childNodes[1]);
                this.__defs.appendChild(pattern);
            }
            return new CanvasPattern(pattern, this);
        };

        Context.prototype.setLineDash = function (dashArray) {
            if (dashArray && dashArray.length > 0) {
                this.lineDash = dashArray.join(",");
            } else {
                this.lineDash = null;
            }
        };

        /**
         * SetTransform changes the current transformation matrix to
         * the matrix given by the arguments as described below.
         *
         * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/setTransform
         */
        Context.prototype.setTransform = function (a, b, c, d, e, f) {
            if (a instanceof DOMMatrix) {
                this.__transformMatrix = new DOMMatrix([a.a, a.b, a.c, a.d, a.e, a.f]);
            } else {
                this.__transformMatrix = new DOMMatrix([a, b, c, d, e, f]);
            }
        };

        /**
         * GetTransform Returns a copy of the current transformation matrix,
         * as a newly created DOMMAtrix Object
         *
         * @returns A DOMMatrix Object
         */
        Context.prototype.getTransform = function () {
            let {a, b, c, d, e, f} = this.__transformMatrix;
            return new DOMMatrix([a, b, c, d, e, f]);
        };

        /**
         * ResetTransform resets the current transformation matrix to the identity matrix
         *
         * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/resetTransform
         */
        Context.prototype.resetTransform = function () {
            this.setTransform(1, 0, 0, 1, 0, 0);
        };

        /**
         * Add the scaling transformation described by the arguments to the current transformation matrix.
         *
         * @param x The x argument represents the scale factor in the horizontal direction
         * @param y The y argument represents the scale factor in the vertical direction.
         * @see https://html.spec.whatwg.org/multipage/canvas.html#dom-context-2d-scale
         */
        Context.prototype.scale = function (x, y) {
            if (y === undefined) {
                y = x;
            }
            // If either of the arguments are infinite or NaN, then return.
            if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) {
                return
            }
            let matrix = this.getTransform().scale(x, y);
            this.setTransform(matrix);
        };

        /**
         * Rotate adds a rotation to the transformation matrix.
         *
         * @param angle The rotation angle, clockwise in radians. You can use degree * Math.PI / 180 to calculate a radian from a degree.
         * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/rotate
         * @see https://www.w3.org/TR/css-transforms-1
         */
        Context.prototype.rotate = function (angle) {
            let matrix = this.getTransform().multiply(new DOMMatrix([
                Math.cos(angle),
                Math.sin(angle),
                -Math.sin(angle),
                Math.cos(angle),
                0,
                0
            ]));
            this.setTransform(matrix);
        };

        /**
         * Translate adds a translation transformation to the current matrix.
         *
         * @param x Distance to move in the horizontal direction. Positive values are to the right, and negative to the left.
         * @param y Distance to move in the vertical direction. Positive values are down, and negative are up.
         * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/translate
         */
        Context.prototype.translate = function (x, y) {
            const matrix = this.getTransform().translate(x, y);
            this.setTransform(matrix);
        };

        /**
         * Transform multiplies the current transformation with the matrix described by the arguments of this method.
         * This lets you scale, rotate, translate (move), and skew the context.
         *
         * @see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/transform
         */
        Context.prototype.transform = function (a, b, c, d, e, f) {
            const matrix = this.getTransform().multiply(new DOMMatrix([a, b, c, d, e, f]));
            this.setTransform(matrix);
        };

        Context.prototype.__matrixTransform = function(x, y) {
            return new DOMPoint(x, y).matrixTransform(this.__transformMatrix)
        };

        /**
         * 
         * @returns The scale component of the transform matrix as {x,y}.
         */
        Context.prototype.__getTransformScale = function() {
            return {
                x: Math.hypot(this.__transformMatrix.a, this.__transformMatrix.b),
                y: Math.hypot(this.__transformMatrix.c, this.__transformMatrix.d)
            };
        };

        /**
         * 
         * @returns The rotation component of the transform matrix in radians.
         */
        Context.prototype.__getTransformRotation = function() {
            return Math.atan2(this.__transformMatrix.b, this.__transformMatrix.a);
        };

        /**
         *
         * @param {*} sx The x-axis coordinate of the top-left corner of the rectangle from which the ImageData will be extracted.
         * @param {*} sy The y-axis coordinate of the top-left corner of the rectangle from which the ImageData will be extracted.
         * @param {*} sw The width of the rectangle from which the ImageData will be extracted. Positive values are to the right, and negative to the left.
         * @param {*} sh The height of the rectangle from which the ImageData will be extracted. Positive values are down, and negative are up.
         * @param {Boolean} options.async Will return a Promise<ImageData> if true, must be set to true
         * @returns An ImageData object containing the image data for the rectangle of the canvas specified. The coordinates of the rectangle's top-left corner are (sx, sy), while the coordinates of the bottom corner are (sx + sw, sy + sh).
         */
        Context.prototype.getImageData = function(sx, sy, sw, sh, options) {
            return utils$1.getImageData(this.getSvg(), this.width, this.height, sx, sy, sw, sh, options);
        };

        /**
         * Not yet implemented
         */
        Context.prototype.drawFocusRing = function () {};
        Context.prototype.createImageData = function () {};
        Context.prototype.putImageData = function () {};
        Context.prototype.globalCompositeOperation = function () {};

        return Context;
    }());

    function SVGCanvasElement(options) {

        this.ctx = new Context(options);
        this.svg = this.ctx.__root;

        // sync attributes to svg
        var svg = this.svg;
        var _this = this;

        var wrapper = document.createElement('div');
        wrapper.style.display = 'inline-block';
        wrapper.appendChild(svg);
        this.wrapper = wrapper;

        Object.defineProperty(this, 'className', {
            get: function() {
                return wrapper.getAttribute('class') || '';
            },
            set: function(val) {
                return wrapper.setAttribute('class', val);
            }
        });

        Object.defineProperty(this, 'tagName', {
            get: function() {
                return "CANVAS";
            },
            set: function() {} // no-op
        });

        ["width", "height"].forEach(function(prop) {
            Object.defineProperty(_this, prop, {
                get: function() {
                    return svg.getAttribute(prop) | 0;
                },
                set: function(val) {
                    if (isNaN(val) || (typeof val === "undefined")) {
                        return;
                    }
                    _this.ctx[prop] = val;
                    svg.setAttribute(prop, val);
                    return wrapper[prop] = val;
                }
            });
        });

        ["style", "id"].forEach(function(prop) {
            Object.defineProperty(_this, prop, {
                get: function() {
                    return wrapper[prop];
                },
                set: function(val) {
                    if (typeof val !== "undefined") {
                        return wrapper[prop] = val;
                    }
                }
            });
        });

        ["getBoundingClientRect"].forEach(function(fn) {
            _this[fn] = function() {
                return svg[fn]();
            };
        });
    }

    SVGCanvasElement.prototype.getContext = function(type) {
        if (type !== '2d') {
            throw new Error('Unsupported type of context for SVGCanvas');
        }

        return this.ctx;
    };

    // you should always use URL.revokeObjectURL after your work done
    SVGCanvasElement.prototype.toObjectURL = function() {
        var data = new XMLSerializer().serializeToString(this.svg);
        var svg = new Blob([data], {type: 'image/svg+xml;charset=utf-8'});
        return URL.createObjectURL(svg);
    };

    /**
     * toDataURL returns a data URI containing a representation of the image in the format specified by the type parameter.
     * 
     * @param {String} type A DOMString indicating the image format. The default type is image/svg+xml; this image format will be also used if the specified type is not supported.
     * @param {Number} encoderOptions A Number between 0 and 1 indicating the image quality to be used when creating images using file formats that support lossy compression (such as image/jpeg or image/webp). A user agent will use its default quality value if this option is not specified, or if the number is outside the allowed range.
     * @param {Boolean} options.async Will return a Promise<String> if true, must be set to true if type is not image/svg+xml
     */
    SVGCanvasElement.prototype.toDataURL = function(type, encoderOptions, options) {
        return utils$1.toDataURL(this.svg, this.width, this.height, type, encoderOptions, options)
    };

    SVGCanvasElement.prototype.addEventListener = function() {
        return this.svg.addEventListener.apply(this.svg, arguments);
    };

    // will return wrapper element: <div><svg></svg></div>
    SVGCanvasElement.prototype.getElement = function() {
        return this.wrapper;
    };

    SVGCanvasElement.prototype.getAttribute = function(prop) {
        return this.wrapper.getAttribute(prop);
    };

    SVGCanvasElement.prototype.setAttribute = function(prop, val) {
        this.wrapper.setAttribute(prop, val);
    };

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function getAugmentedNamespace(n) {
    	if (n.__esModule) return n;
    	var a = Object.defineProperty({}, '__esModule', {value: true});
    	Object.keys(n).forEach(function (k) {
    		var d = Object.getOwnPropertyDescriptor(n, k);
    		Object.defineProperty(a, k, d.get ? d : {
    			enumerable: true,
    			get: function () {
    				return n[k];
    			}
    		});
    	});
    	return a;
    }

    var chai$7 = {};

    /*!
     * assertion-error
     * Copyright(c) 2013 Jake Luer <jake@qualiancy.com>
     * MIT Licensed
     */

    /*!
     * Return a function that will copy properties from
     * one object to another excluding any originally
     * listed. Returned function will create a new `{}`.
     *
     * @param {String} excluded properties ...
     * @return {Function}
     */

    function exclude () {
      var excludes = [].slice.call(arguments);

      function excludeProps (res, obj) {
        Object.keys(obj).forEach(function (key) {
          if (!~excludes.indexOf(key)) res[key] = obj[key];
        });
      }

      return function extendExclude () {
        var args = [].slice.call(arguments)
          , i = 0
          , res = {};

        for (; i < args.length; i++) {
          excludeProps(res, args[i]);
        }

        return res;
      };
    }
    /*!
     * Primary Exports
     */

    var assertionError = AssertionError$1;

    /**
     * ### AssertionError
     *
     * An extension of the JavaScript `Error` constructor for
     * assertion and validation scenarios.
     *
     * @param {String} message
     * @param {Object} properties to include (optional)
     * @param {callee} start stack function (optional)
     */

    function AssertionError$1 (message, _props, ssf) {
      var extend = exclude('name', 'message', 'stack', 'constructor', 'toJSON')
        , props = extend(_props || {});

      // default values
      this.message = message || 'Unspecified AssertionError';
      this.showDiff = false;

      // copy from properties
      for (var key in props) {
        this[key] = props[key];
      }

      // capture stack trace
      ssf = ssf || AssertionError$1;
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, ssf);
      } else {
        try {
          throw new Error();
        } catch(e) {
          this.stack = e.stack;
        }
      }
    }

    /*!
     * Inherit from Error.prototype
     */

    AssertionError$1.prototype = Object.create(Error.prototype);

    /*!
     * Statically set name
     */

    AssertionError$1.prototype.name = 'AssertionError';

    /*!
     * Ensure correct constructor
     */

    AssertionError$1.prototype.constructor = AssertionError$1;

    /**
     * Allow errors to be converted to JSON for static transfer.
     *
     * @param {Boolean} include stack (default: `true`)
     * @return {Object} object that can be `JSON.stringify`
     */

    AssertionError$1.prototype.toJSON = function (stack) {
      var extend = exclude('constructor', 'toJSON', 'stack')
        , props = extend({ name: this.name }, this);

      // include stack if exists and not turned off
      if (false !== stack && this.stack) {
        props.stack = this.stack;
      }

      return props;
    };

    var utils = {};

    /* !
     * Chai - pathval utility
     * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
     * @see https://github.com/logicalparadox/filtr
     * MIT Licensed
     */

    /**
     * ### .hasProperty(object, name)
     *
     * This allows checking whether an object has own
     * or inherited from prototype chain named property.
     *
     * Basically does the same thing as the `in`
     * operator but works properly with null/undefined values
     * and other primitives.
     *
     *     var obj = {
     *         arr: ['a', 'b', 'c']
     *       , str: 'Hello'
     *     }
     *
     * The following would be the results.
     *
     *     hasProperty(obj, 'str');  // true
     *     hasProperty(obj, 'constructor');  // true
     *     hasProperty(obj, 'bar');  // false
     *
     *     hasProperty(obj.str, 'length'); // true
     *     hasProperty(obj.str, 1);  // true
     *     hasProperty(obj.str, 5);  // false
     *
     *     hasProperty(obj.arr, 'length');  // true
     *     hasProperty(obj.arr, 2);  // true
     *     hasProperty(obj.arr, 3);  // false
     *
     * @param {Object} object
     * @param {String|Symbol} name
     * @returns {Boolean} whether it exists
     * @namespace Utils
     * @name hasProperty
     * @api public
     */

    function hasProperty(obj, name) {
      if (typeof obj === 'undefined' || obj === null) {
        return false;
      }

      // The `in` operator does not work with primitives.
      return name in Object(obj);
    }

    /* !
     * ## parsePath(path)
     *
     * Helper function used to parse string object
     * paths. Use in conjunction with `internalGetPathValue`.
     *
     *      var parsed = parsePath('myobject.property.subprop');
     *
     * ### Paths:
     *
     * * Can be infinitely deep and nested.
     * * Arrays are also valid using the formal `myobject.document[3].property`.
     * * Literal dots and brackets (not delimiter) must be backslash-escaped.
     *
     * @param {String} path
     * @returns {Object} parsed
     * @api private
     */

    function parsePath(path) {
      var str = path.replace(/([^\\])\[/g, '$1.[');
      var parts = str.match(/(\\\.|[^.]+?)+/g);
      return parts.map(function mapMatches(value) {
        if (
          value === 'constructor' ||
          value === '__proto__' ||
          value === 'prototype'
        ) {
          return {};
        }
        var regexp = /^\[(\d+)\]$/;
        var mArr = regexp.exec(value);
        var parsed = null;
        if (mArr) {
          parsed = { i: parseFloat(mArr[1]) };
        } else {
          parsed = { p: value.replace(/\\([.[\]])/g, '$1') };
        }

        return parsed;
      });
    }

    /* !
     * ## internalGetPathValue(obj, parsed[, pathDepth])
     *
     * Helper companion function for `.parsePath` that returns
     * the value located at the parsed address.
     *
     *      var value = getPathValue(obj, parsed);
     *
     * @param {Object} object to search against
     * @param {Object} parsed definition from `parsePath`.
     * @param {Number} depth (nesting level) of the property we want to retrieve
     * @returns {Object|Undefined} value
     * @api private
     */

    function internalGetPathValue(obj, parsed, pathDepth) {
      var temporaryValue = obj;
      var res = null;
      pathDepth = typeof pathDepth === 'undefined' ? parsed.length : pathDepth;

      for (var i = 0; i < pathDepth; i++) {
        var part = parsed[i];
        if (temporaryValue) {
          if (typeof part.p === 'undefined') {
            temporaryValue = temporaryValue[part.i];
          } else {
            temporaryValue = temporaryValue[part.p];
          }

          if (i === pathDepth - 1) {
            res = temporaryValue;
          }
        }
      }

      return res;
    }

    /* !
     * ## internalSetPathValue(obj, value, parsed)
     *
     * Companion function for `parsePath` that sets
     * the value located at a parsed address.
     *
     *  internalSetPathValue(obj, 'value', parsed);
     *
     * @param {Object} object to search and define on
     * @param {*} value to use upon set
     * @param {Object} parsed definition from `parsePath`
     * @api private
     */

    function internalSetPathValue(obj, val, parsed) {
      var tempObj = obj;
      var pathDepth = parsed.length;
      var part = null;
      // Here we iterate through every part of the path
      for (var i = 0; i < pathDepth; i++) {
        var propName = null;
        var propVal = null;
        part = parsed[i];

        // If it's the last part of the path, we set the 'propName' value with the property name
        if (i === pathDepth - 1) {
          propName = typeof part.p === 'undefined' ? part.i : part.p;
          // Now we set the property with the name held by 'propName' on object with the desired val
          tempObj[propName] = val;
        } else if (typeof part.p !== 'undefined' && tempObj[part.p]) {
          tempObj = tempObj[part.p];
        } else if (typeof part.i !== 'undefined' && tempObj[part.i]) {
          tempObj = tempObj[part.i];
        } else {
          // If the obj doesn't have the property we create one with that name to define it
          var next = parsed[i + 1];
          // Here we set the name of the property which will be defined
          propName = typeof part.p === 'undefined' ? part.i : part.p;
          // Here we decide if this property will be an array or a new object
          propVal = typeof next.p === 'undefined' ? [] : {};
          tempObj[propName] = propVal;
          tempObj = tempObj[propName];
        }
      }
    }

    /**
     * ### .getPathInfo(object, path)
     *
     * This allows the retrieval of property info in an
     * object given a string path.
     *
     * The path info consists of an object with the
     * following properties:
     *
     * * parent - The parent object of the property referenced by `path`
     * * name - The name of the final property, a number if it was an array indexer
     * * value - The value of the property, if it exists, otherwise `undefined`
     * * exists - Whether the property exists or not
     *
     * @param {Object} object
     * @param {String} path
     * @returns {Object} info
     * @namespace Utils
     * @name getPathInfo
     * @api public
     */

    function getPathInfo(obj, path) {
      var parsed = parsePath(path);
      var last = parsed[parsed.length - 1];
      var info = {
        parent:
          parsed.length > 1 ?
            internalGetPathValue(obj, parsed, parsed.length - 1) :
            obj,
        name: last.p || last.i,
        value: internalGetPathValue(obj, parsed),
      };
      info.exists = hasProperty(info.parent, info.name);

      return info;
    }

    /**
     * ### .getPathValue(object, path)
     *
     * This allows the retrieval of values in an
     * object given a string path.
     *
     *     var obj = {
     *         prop1: {
     *             arr: ['a', 'b', 'c']
     *           , str: 'Hello'
     *         }
     *       , prop2: {
     *             arr: [ { nested: 'Universe' } ]
     *           , str: 'Hello again!'
     *         }
     *     }
     *
     * The following would be the results.
     *
     *     getPathValue(obj, 'prop1.str'); // Hello
     *     getPathValue(obj, 'prop1.att[2]'); // b
     *     getPathValue(obj, 'prop2.arr[0].nested'); // Universe
     *
     * @param {Object} object
     * @param {String} path
     * @returns {Object} value or `undefined`
     * @namespace Utils
     * @name getPathValue
     * @api public
     */

    function getPathValue(obj, path) {
      var info = getPathInfo(obj, path);
      return info.value;
    }

    /**
     * ### .setPathValue(object, path, value)
     *
     * Define the value in an object at a given string path.
     *
     * ```js
     * var obj = {
     *     prop1: {
     *         arr: ['a', 'b', 'c']
     *       , str: 'Hello'
     *     }
     *   , prop2: {
     *         arr: [ { nested: 'Universe' } ]
     *       , str: 'Hello again!'
     *     }
     * };
     * ```
     *
     * The following would be acceptable.
     *
     * ```js
     * var properties = require('tea-properties');
     * properties.set(obj, 'prop1.str', 'Hello Universe!');
     * properties.set(obj, 'prop1.arr[2]', 'B');
     * properties.set(obj, 'prop2.arr[0].nested.value', { hello: 'universe' });
     * ```
     *
     * @param {Object} object
     * @param {String} path
     * @param {Mixed} value
     * @api private
     */

    function setPathValue(obj, path, val) {
      var parsed = parsePath(path);
      internalSetPathValue(obj, val, parsed);
      return obj;
    }

    var pathval$1 = {
      hasProperty: hasProperty,
      getPathInfo: getPathInfo,
      getPathValue: getPathValue,
      setPathValue: setPathValue,
    };

    /*!
     * Chai - flag utility
     * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
     * MIT Licensed
     */

    /**
     * ### .flag(object, key, [value])
     *
     * Get or set a flag value on an object. If a
     * value is provided it will be set, else it will
     * return the currently set value or `undefined` if
     * the value is not set.
     *
     *     utils.flag(this, 'foo', 'bar'); // setter
     *     utils.flag(this, 'foo'); // getter, returns `bar`
     *
     * @param {Object} object constructed Assertion
     * @param {String} key
     * @param {Mixed} value (optional)
     * @namespace Utils
     * @name flag
     * @api private
     */

    var flag$a = function flag(obj, key, value) {
      var flags = obj.__flags || (obj.__flags = Object.create(null));
      if (arguments.length === 3) {
        flags[key] = value;
      } else {
        return flags[key];
      }
    };

    /*!
     * Chai - test utility
     * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
     * MIT Licensed
     */

    /*!
     * Module dependencies
     */

    var flag$9 = flag$a;

    /**
     * ### .test(object, expression)
     *
     * Test and object for expression.
     *
     * @param {Object} object (constructed Assertion)
     * @param {Arguments} chai.Assertion.prototype.assert arguments
     * @namespace Utils
     * @name test
     */

    var test = function test(obj, args) {
      var negate = flag$9(obj, 'negate')
        , expr = args[0];
      return negate ? !expr : expr;
    };

    var typeDetect = {exports: {}};

    (function (module, exports) {
    (function (global, factory) {
    	module.exports = factory() ;
    }(commonjsGlobal, (function () {
    /* !
     * type-detect
     * Copyright(c) 2013 jake luer <jake@alogicalparadox.com>
     * MIT Licensed
     */
    var promiseExists = typeof Promise === 'function';

    /* eslint-disable no-undef */
    var globalObject = typeof self === 'object' ? self : commonjsGlobal; // eslint-disable-line id-blacklist

    var symbolExists = typeof Symbol !== 'undefined';
    var mapExists = typeof Map !== 'undefined';
    var setExists = typeof Set !== 'undefined';
    var weakMapExists = typeof WeakMap !== 'undefined';
    var weakSetExists = typeof WeakSet !== 'undefined';
    var dataViewExists = typeof DataView !== 'undefined';
    var symbolIteratorExists = symbolExists && typeof Symbol.iterator !== 'undefined';
    var symbolToStringTagExists = symbolExists && typeof Symbol.toStringTag !== 'undefined';
    var setEntriesExists = setExists && typeof Set.prototype.entries === 'function';
    var mapEntriesExists = mapExists && typeof Map.prototype.entries === 'function';
    var setIteratorPrototype = setEntriesExists && Object.getPrototypeOf(new Set().entries());
    var mapIteratorPrototype = mapEntriesExists && Object.getPrototypeOf(new Map().entries());
    var arrayIteratorExists = symbolIteratorExists && typeof Array.prototype[Symbol.iterator] === 'function';
    var arrayIteratorPrototype = arrayIteratorExists && Object.getPrototypeOf([][Symbol.iterator]());
    var stringIteratorExists = symbolIteratorExists && typeof String.prototype[Symbol.iterator] === 'function';
    var stringIteratorPrototype = stringIteratorExists && Object.getPrototypeOf(''[Symbol.iterator]());
    var toStringLeftSliceLength = 8;
    var toStringRightSliceLength = -1;
    /**
     * ### typeOf (obj)
     *
     * Uses `Object.prototype.toString` to determine the type of an object,
     * normalising behaviour across engine versions & well optimised.
     *
     * @param {Mixed} object
     * @return {String} object type
     * @api public
     */
    function typeDetect(obj) {
      /* ! Speed optimisation
       * Pre:
       *   string literal     x 3,039,035 ops/sec ±1.62% (78 runs sampled)
       *   boolean literal    x 1,424,138 ops/sec ±4.54% (75 runs sampled)
       *   number literal     x 1,653,153 ops/sec ±1.91% (82 runs sampled)
       *   undefined          x 9,978,660 ops/sec ±1.92% (75 runs sampled)
       *   function           x 2,556,769 ops/sec ±1.73% (77 runs sampled)
       * Post:
       *   string literal     x 38,564,796 ops/sec ±1.15% (79 runs sampled)
       *   boolean literal    x 31,148,940 ops/sec ±1.10% (79 runs sampled)
       *   number literal     x 32,679,330 ops/sec ±1.90% (78 runs sampled)
       *   undefined          x 32,363,368 ops/sec ±1.07% (82 runs sampled)
       *   function           x 31,296,870 ops/sec ±0.96% (83 runs sampled)
       */
      var typeofObj = typeof obj;
      if (typeofObj !== 'object') {
        return typeofObj;
      }

      /* ! Speed optimisation
       * Pre:
       *   null               x 28,645,765 ops/sec ±1.17% (82 runs sampled)
       * Post:
       *   null               x 36,428,962 ops/sec ±1.37% (84 runs sampled)
       */
      if (obj === null) {
        return 'null';
      }

      /* ! Spec Conformance
       * Test: `Object.prototype.toString.call(window)``
       *  - Node === "[object global]"
       *  - Chrome === "[object global]"
       *  - Firefox === "[object Window]"
       *  - PhantomJS === "[object Window]"
       *  - Safari === "[object Window]"
       *  - IE 11 === "[object Window]"
       *  - IE Edge === "[object Window]"
       * Test: `Object.prototype.toString.call(this)``
       *  - Chrome Worker === "[object global]"
       *  - Firefox Worker === "[object DedicatedWorkerGlobalScope]"
       *  - Safari Worker === "[object DedicatedWorkerGlobalScope]"
       *  - IE 11 Worker === "[object WorkerGlobalScope]"
       *  - IE Edge Worker === "[object WorkerGlobalScope]"
       */
      if (obj === globalObject) {
        return 'global';
      }

      /* ! Speed optimisation
       * Pre:
       *   array literal      x 2,888,352 ops/sec ±0.67% (82 runs sampled)
       * Post:
       *   array literal      x 22,479,650 ops/sec ±0.96% (81 runs sampled)
       */
      if (
        Array.isArray(obj) &&
        (symbolToStringTagExists === false || !(Symbol.toStringTag in obj))
      ) {
        return 'Array';
      }

      // Not caching existence of `window` and related properties due to potential
      // for `window` to be unset before tests in quasi-browser environments.
      if (typeof window === 'object' && window !== null) {
        /* ! Spec Conformance
         * (https://html.spec.whatwg.org/multipage/browsers.html#location)
         * WhatWG HTML$7.7.3 - The `Location` interface
         * Test: `Object.prototype.toString.call(window.location)``
         *  - IE <=11 === "[object Object]"
         *  - IE Edge <=13 === "[object Object]"
         */
        if (typeof window.location === 'object' && obj === window.location) {
          return 'Location';
        }

        /* ! Spec Conformance
         * (https://html.spec.whatwg.org/#document)
         * WhatWG HTML$3.1.1 - The `Document` object
         * Note: Most browsers currently adher to the W3C DOM Level 2 spec
         *       (https://www.w3.org/TR/DOM-Level-2-HTML/html.html#ID-26809268)
         *       which suggests that browsers should use HTMLTableCellElement for
         *       both TD and TH elements. WhatWG separates these.
         *       WhatWG HTML states:
         *         > For historical reasons, Window objects must also have a
         *         > writable, configurable, non-enumerable property named
         *         > HTMLDocument whose value is the Document interface object.
         * Test: `Object.prototype.toString.call(document)``
         *  - Chrome === "[object HTMLDocument]"
         *  - Firefox === "[object HTMLDocument]"
         *  - Safari === "[object HTMLDocument]"
         *  - IE <=10 === "[object Document]"
         *  - IE 11 === "[object HTMLDocument]"
         *  - IE Edge <=13 === "[object HTMLDocument]"
         */
        if (typeof window.document === 'object' && obj === window.document) {
          return 'Document';
        }

        if (typeof window.navigator === 'object') {
          /* ! Spec Conformance
           * (https://html.spec.whatwg.org/multipage/webappapis.html#mimetypearray)
           * WhatWG HTML$8.6.1.5 - Plugins - Interface MimeTypeArray
           * Test: `Object.prototype.toString.call(navigator.mimeTypes)``
           *  - IE <=10 === "[object MSMimeTypesCollection]"
           */
          if (typeof window.navigator.mimeTypes === 'object' &&
              obj === window.navigator.mimeTypes) {
            return 'MimeTypeArray';
          }

          /* ! Spec Conformance
           * (https://html.spec.whatwg.org/multipage/webappapis.html#pluginarray)
           * WhatWG HTML$8.6.1.5 - Plugins - Interface PluginArray
           * Test: `Object.prototype.toString.call(navigator.plugins)``
           *  - IE <=10 === "[object MSPluginsCollection]"
           */
          if (typeof window.navigator.plugins === 'object' &&
              obj === window.navigator.plugins) {
            return 'PluginArray';
          }
        }

        if ((typeof window.HTMLElement === 'function' ||
            typeof window.HTMLElement === 'object') &&
            obj instanceof window.HTMLElement) {
          /* ! Spec Conformance
          * (https://html.spec.whatwg.org/multipage/webappapis.html#pluginarray)
          * WhatWG HTML$4.4.4 - The `blockquote` element - Interface `HTMLQuoteElement`
          * Test: `Object.prototype.toString.call(document.createElement('blockquote'))``
          *  - IE <=10 === "[object HTMLBlockElement]"
          */
          if (obj.tagName === 'BLOCKQUOTE') {
            return 'HTMLQuoteElement';
          }

          /* ! Spec Conformance
           * (https://html.spec.whatwg.org/#htmltabledatacellelement)
           * WhatWG HTML$4.9.9 - The `td` element - Interface `HTMLTableDataCellElement`
           * Note: Most browsers currently adher to the W3C DOM Level 2 spec
           *       (https://www.w3.org/TR/DOM-Level-2-HTML/html.html#ID-82915075)
           *       which suggests that browsers should use HTMLTableCellElement for
           *       both TD and TH elements. WhatWG separates these.
           * Test: Object.prototype.toString.call(document.createElement('td'))
           *  - Chrome === "[object HTMLTableCellElement]"
           *  - Firefox === "[object HTMLTableCellElement]"
           *  - Safari === "[object HTMLTableCellElement]"
           */
          if (obj.tagName === 'TD') {
            return 'HTMLTableDataCellElement';
          }

          /* ! Spec Conformance
           * (https://html.spec.whatwg.org/#htmltableheadercellelement)
           * WhatWG HTML$4.9.9 - The `td` element - Interface `HTMLTableHeaderCellElement`
           * Note: Most browsers currently adher to the W3C DOM Level 2 spec
           *       (https://www.w3.org/TR/DOM-Level-2-HTML/html.html#ID-82915075)
           *       which suggests that browsers should use HTMLTableCellElement for
           *       both TD and TH elements. WhatWG separates these.
           * Test: Object.prototype.toString.call(document.createElement('th'))
           *  - Chrome === "[object HTMLTableCellElement]"
           *  - Firefox === "[object HTMLTableCellElement]"
           *  - Safari === "[object HTMLTableCellElement]"
           */
          if (obj.tagName === 'TH') {
            return 'HTMLTableHeaderCellElement';
          }
        }
      }

      /* ! Speed optimisation
      * Pre:
      *   Float64Array       x 625,644 ops/sec ±1.58% (80 runs sampled)
      *   Float32Array       x 1,279,852 ops/sec ±2.91% (77 runs sampled)
      *   Uint32Array        x 1,178,185 ops/sec ±1.95% (83 runs sampled)
      *   Uint16Array        x 1,008,380 ops/sec ±2.25% (80 runs sampled)
      *   Uint8Array         x 1,128,040 ops/sec ±2.11% (81 runs sampled)
      *   Int32Array         x 1,170,119 ops/sec ±2.88% (80 runs sampled)
      *   Int16Array         x 1,176,348 ops/sec ±5.79% (86 runs sampled)
      *   Int8Array          x 1,058,707 ops/sec ±4.94% (77 runs sampled)
      *   Uint8ClampedArray  x 1,110,633 ops/sec ±4.20% (80 runs sampled)
      * Post:
      *   Float64Array       x 7,105,671 ops/sec ±13.47% (64 runs sampled)
      *   Float32Array       x 5,887,912 ops/sec ±1.46% (82 runs sampled)
      *   Uint32Array        x 6,491,661 ops/sec ±1.76% (79 runs sampled)
      *   Uint16Array        x 6,559,795 ops/sec ±1.67% (82 runs sampled)
      *   Uint8Array         x 6,463,966 ops/sec ±1.43% (85 runs sampled)
      *   Int32Array         x 5,641,841 ops/sec ±3.49% (81 runs sampled)
      *   Int16Array         x 6,583,511 ops/sec ±1.98% (80 runs sampled)
      *   Int8Array          x 6,606,078 ops/sec ±1.74% (81 runs sampled)
      *   Uint8ClampedArray  x 6,602,224 ops/sec ±1.77% (83 runs sampled)
      */
      var stringTag = (symbolToStringTagExists && obj[Symbol.toStringTag]);
      if (typeof stringTag === 'string') {
        return stringTag;
      }

      var objPrototype = Object.getPrototypeOf(obj);
      /* ! Speed optimisation
      * Pre:
      *   regex literal      x 1,772,385 ops/sec ±1.85% (77 runs sampled)
      *   regex constructor  x 2,143,634 ops/sec ±2.46% (78 runs sampled)
      * Post:
      *   regex literal      x 3,928,009 ops/sec ±0.65% (78 runs sampled)
      *   regex constructor  x 3,931,108 ops/sec ±0.58% (84 runs sampled)
      */
      if (objPrototype === RegExp.prototype) {
        return 'RegExp';
      }

      /* ! Speed optimisation
      * Pre:
      *   date               x 2,130,074 ops/sec ±4.42% (68 runs sampled)
      * Post:
      *   date               x 3,953,779 ops/sec ±1.35% (77 runs sampled)
      */
      if (objPrototype === Date.prototype) {
        return 'Date';
      }

      /* ! Spec Conformance
       * (http://www.ecma-international.org/ecma-262/6.0/index.html#sec-promise.prototype-@@tostringtag)
       * ES6$25.4.5.4 - Promise.prototype[@@toStringTag] should be "Promise":
       * Test: `Object.prototype.toString.call(Promise.resolve())``
       *  - Chrome <=47 === "[object Object]"
       *  - Edge <=20 === "[object Object]"
       *  - Firefox 29-Latest === "[object Promise]"
       *  - Safari 7.1-Latest === "[object Promise]"
       */
      if (promiseExists && objPrototype === Promise.prototype) {
        return 'Promise';
      }

      /* ! Speed optimisation
      * Pre:
      *   set                x 2,222,186 ops/sec ±1.31% (82 runs sampled)
      * Post:
      *   set                x 4,545,879 ops/sec ±1.13% (83 runs sampled)
      */
      if (setExists && objPrototype === Set.prototype) {
        return 'Set';
      }

      /* ! Speed optimisation
      * Pre:
      *   map                x 2,396,842 ops/sec ±1.59% (81 runs sampled)
      * Post:
      *   map                x 4,183,945 ops/sec ±6.59% (82 runs sampled)
      */
      if (mapExists && objPrototype === Map.prototype) {
        return 'Map';
      }

      /* ! Speed optimisation
      * Pre:
      *   weakset            x 1,323,220 ops/sec ±2.17% (76 runs sampled)
      * Post:
      *   weakset            x 4,237,510 ops/sec ±2.01% (77 runs sampled)
      */
      if (weakSetExists && objPrototype === WeakSet.prototype) {
        return 'WeakSet';
      }

      /* ! Speed optimisation
      * Pre:
      *   weakmap            x 1,500,260 ops/sec ±2.02% (78 runs sampled)
      * Post:
      *   weakmap            x 3,881,384 ops/sec ±1.45% (82 runs sampled)
      */
      if (weakMapExists && objPrototype === WeakMap.prototype) {
        return 'WeakMap';
      }

      /* ! Spec Conformance
       * (http://www.ecma-international.org/ecma-262/6.0/index.html#sec-dataview.prototype-@@tostringtag)
       * ES6$24.2.4.21 - DataView.prototype[@@toStringTag] should be "DataView":
       * Test: `Object.prototype.toString.call(new DataView(new ArrayBuffer(1)))``
       *  - Edge <=13 === "[object Object]"
       */
      if (dataViewExists && objPrototype === DataView.prototype) {
        return 'DataView';
      }

      /* ! Spec Conformance
       * (http://www.ecma-international.org/ecma-262/6.0/index.html#sec-%mapiteratorprototype%-@@tostringtag)
       * ES6$23.1.5.2.2 - %MapIteratorPrototype%[@@toStringTag] should be "Map Iterator":
       * Test: `Object.prototype.toString.call(new Map().entries())``
       *  - Edge <=13 === "[object Object]"
       */
      if (mapExists && objPrototype === mapIteratorPrototype) {
        return 'Map Iterator';
      }

      /* ! Spec Conformance
       * (http://www.ecma-international.org/ecma-262/6.0/index.html#sec-%setiteratorprototype%-@@tostringtag)
       * ES6$23.2.5.2.2 - %SetIteratorPrototype%[@@toStringTag] should be "Set Iterator":
       * Test: `Object.prototype.toString.call(new Set().entries())``
       *  - Edge <=13 === "[object Object]"
       */
      if (setExists && objPrototype === setIteratorPrototype) {
        return 'Set Iterator';
      }

      /* ! Spec Conformance
       * (http://www.ecma-international.org/ecma-262/6.0/index.html#sec-%arrayiteratorprototype%-@@tostringtag)
       * ES6$22.1.5.2.2 - %ArrayIteratorPrototype%[@@toStringTag] should be "Array Iterator":
       * Test: `Object.prototype.toString.call([][Symbol.iterator]())``
       *  - Edge <=13 === "[object Object]"
       */
      if (arrayIteratorExists && objPrototype === arrayIteratorPrototype) {
        return 'Array Iterator';
      }

      /* ! Spec Conformance
       * (http://www.ecma-international.org/ecma-262/6.0/index.html#sec-%stringiteratorprototype%-@@tostringtag)
       * ES6$21.1.5.2.2 - %StringIteratorPrototype%[@@toStringTag] should be "String Iterator":
       * Test: `Object.prototype.toString.call(''[Symbol.iterator]())``
       *  - Edge <=13 === "[object Object]"
       */
      if (stringIteratorExists && objPrototype === stringIteratorPrototype) {
        return 'String Iterator';
      }

      /* ! Speed optimisation
      * Pre:
      *   object from null   x 2,424,320 ops/sec ±1.67% (76 runs sampled)
      * Post:
      *   object from null   x 5,838,000 ops/sec ±0.99% (84 runs sampled)
      */
      if (objPrototype === null) {
        return 'Object';
      }

      return Object
        .prototype
        .toString
        .call(obj)
        .slice(toStringLeftSliceLength, toStringRightSliceLength);
    }

    return typeDetect;

    })));
    }(typeDetect));

    /*!
     * Chai - expectTypes utility
     * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
     * MIT Licensed
     */

    /**
     * ### .expectTypes(obj, types)
     *
     * Ensures that the object being tested against is of a valid type.
     *
     *     utils.expectTypes(this, ['array', 'object', 'string']);
     *
     * @param {Mixed} obj constructed Assertion
     * @param {Array} type A list of allowed types for this assertion
     * @namespace Utils
     * @name expectTypes
     * @api public
     */

    var AssertionError = assertionError;
    var flag$8 = flag$a;
    var type$2 = typeDetect.exports;

    var expectTypes = function expectTypes(obj, types) {
      var flagMsg = flag$8(obj, 'message');
      var ssfi = flag$8(obj, 'ssfi');

      flagMsg = flagMsg ? flagMsg + ': ' : '';

      obj = flag$8(obj, 'object');
      types = types.map(function (t) { return t.toLowerCase(); });
      types.sort();

      // Transforms ['lorem', 'ipsum'] into 'a lorem, or an ipsum'
      var str = types.map(function (t, index) {
        var art = ~[ 'a', 'e', 'i', 'o', 'u' ].indexOf(t.charAt(0)) ? 'an' : 'a';
        var or = types.length > 1 && index === types.length - 1 ? 'or ' : '';
        return or + art + ' ' + t;
      }).join(', ');

      var objType = type$2(obj).toLowerCase();

      if (!types.some(function (expected) { return objType === expected; })) {
        throw new AssertionError(
          flagMsg + 'object tested must be ' + str + ', but ' + objType + ' given',
          undefined,
          ssfi
        );
      }
    };

    /*!
     * Chai - getActual utility
     * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
     * MIT Licensed
     */

    /**
     * ### .getActual(object, [actual])
     *
     * Returns the `actual` value for an Assertion.
     *
     * @param {Object} object (constructed Assertion)
     * @param {Arguments} chai.Assertion.prototype.assert arguments
     * @namespace Utils
     * @name getActual
     */

    var getActual$1 = function getActual(obj, args) {
      return args.length > 4 ? args[4] : obj._obj;
    };

    /* !
     * Chai - getFuncName utility
     * Copyright(c) 2012-2016 Jake Luer <jake@alogicalparadox.com>
     * MIT Licensed
     */

    /**
     * ### .getFuncName(constructorFn)
     *
     * Returns the name of a function.
     * When a non-function instance is passed, returns `null`.
     * This also includes a polyfill function if `aFunc.name` is not defined.
     *
     * @name getFuncName
     * @param {Function} funct
     * @namespace Utils
     * @api public
     */

    var toString$1 = Function.prototype.toString;
    var functionNameMatch$1 = /\s*function(?:\s|\s*\/\*[^(?:*\/)]+\*\/\s*)*([^\s\(\/]+)/;
    function getFuncName(aFunc) {
      if (typeof aFunc !== 'function') {
        return null;
      }

      var name = '';
      if (typeof Function.prototype.name === 'undefined' && typeof aFunc.name === 'undefined') {
        // Here we run a polyfill if Function does not support the `name` property and if aFunc.name is not defined
        var match = toString$1.call(aFunc).match(functionNameMatch$1);
        if (match) {
          name = match[1];
        }
      } else {
        // If we've got a `name` property we just use it
        name = aFunc.name;
      }

      return name;
    }

    var getFuncName_1 = getFuncName;

    const ansiColors = {
      bold: ['1', '22'],
      dim: ['2', '22'],
      italic: ['3', '23'],
      underline: ['4', '24'],
      // 5 & 6 are blinking
      inverse: ['7', '27'],
      hidden: ['8', '28'],
      strike: ['9', '29'],
      // 10-20 are fonts
      // 21-29 are resets for 1-9
      black: ['30', '39'],
      red: ['31', '39'],
      green: ['32', '39'],
      yellow: ['33', '39'],
      blue: ['34', '39'],
      magenta: ['35', '39'],
      cyan: ['36', '39'],
      white: ['37', '39'],

      brightblack: ['30;1', '39'],
      brightred: ['31;1', '39'],
      brightgreen: ['32;1', '39'],
      brightyellow: ['33;1', '39'],
      brightblue: ['34;1', '39'],
      brightmagenta: ['35;1', '39'],
      brightcyan: ['36;1', '39'],
      brightwhite: ['37;1', '39'],

      grey: ['90', '39'],
    };

    const styles = {
      special: 'cyan',
      number: 'yellow',
      bigint: 'yellow',
      boolean: 'yellow',
      undefined: 'grey',
      null: 'bold',
      string: 'green',
      symbol: 'green',
      date: 'magenta',
      regexp: 'red',
    };

    const truncator = '…';

    function colorise(value, styleType) {
      const color = ansiColors[styles[styleType]] || ansiColors[styleType];
      if (!color) {
        return String(value)
      }
      return `\u001b[${color[0]}m${String(value)}\u001b[${color[1]}m`
    }

    function normaliseOptions({
      showHidden = false,
      depth = 2,
      colors = false,
      customInspect = true,
      showProxy = false,
      maxArrayLength = Infinity,
      breakLength = Infinity,
      seen = [],
      // eslint-disable-next-line no-shadow
      truncate = Infinity,
      stylize = String,
    } = {}) {
      const options = {
        showHidden: Boolean(showHidden),
        depth: Number(depth),
        colors: Boolean(colors),
        customInspect: Boolean(customInspect),
        showProxy: Boolean(showProxy),
        maxArrayLength: Number(maxArrayLength),
        breakLength: Number(breakLength),
        truncate: Number(truncate),
        seen,
        stylize,
      };
      if (options.colors) {
        options.stylize = colorise;
      }
      return options
    }

    function truncate(string, length, tail = truncator) {
      string = String(string);
      const tailLength = tail.length;
      const stringLength = string.length;
      if (tailLength > length && stringLength > tailLength) {
        return tail
      }
      if (stringLength > length && stringLength > tailLength) {
        return `${string.slice(0, length - tailLength)}${tail}`
      }
      return string
    }

    // eslint-disable-next-line complexity
    function inspectList(list, options, inspectItem, separator = ', ') {
      inspectItem = inspectItem || options.inspect;
      const size = list.length;
      if (size === 0) return ''
      const originalLength = options.truncate;
      let output = '';
      let peek = '';
      let truncated = '';
      for (let i = 0; i < size; i += 1) {
        const last = i + 1 === list.length;
        const secondToLast = i + 2 === list.length;
        truncated = `${truncator}(${list.length - i})`;
        const value = list[i];

        // If there is more than one remaining we need to account for a separator of `, `
        options.truncate = originalLength - output.length - (last ? 0 : separator.length);
        const string = peek || inspectItem(value, options) + (last ? '' : separator);
        const nextLength = output.length + string.length;
        const truncatedLength = nextLength + truncated.length;

        // If this is the last element, and adding it would
        // take us over length, but adding the truncator wouldn't - then break now
        if (last && nextLength > originalLength && output.length + truncated.length <= originalLength) {
          break
        }

        // If this isn't the last or second to last element to scan,
        // but the string is already over length then break here
        if (!last && !secondToLast && truncatedLength > originalLength) {
          break
        }

        // Peek at the next string to determine if we should
        // break early before adding this item to the output
        peek = last ? '' : inspectItem(list[i + 1], options) + (secondToLast ? '' : separator);

        // If we have one element left, but this element and
        // the next takes over length, the break early
        if (!last && secondToLast && truncatedLength > originalLength && nextLength + peek.length > originalLength) {
          break
        }

        output += string;

        // If the next element takes us to length -
        // but there are more after that, then we should truncate now
        if (!last && !secondToLast && nextLength + peek.length >= originalLength) {
          truncated = `${truncator}(${list.length - i - 1})`;
          break
        }

        truncated = '';
      }
      return `${output}${truncated}`
    }

    function quoteComplexKey(key) {
      if (key.match(/^[a-zA-Z_][a-zA-Z_0-9]*$/)) {
        return key
      }
      return JSON.stringify(key)
        .replace(/'/g, "\\'")
        .replace(/\\"/g, '"')
        .replace(/(^"|"$)/g, "'")
    }

    function inspectProperty([key, value], options) {
      options.truncate -= 2;
      if (typeof key === 'string') {
        key = quoteComplexKey(key);
      } else if (typeof key !== 'number') {
        key = `[${options.inspect(key, options)}]`;
      }
      options.truncate -= key.length;
      value = options.inspect(value, options);
      return `${key}: ${value}`
    }

    function inspectArray(array, options) {
      // Object.keys will always output the Array indices first, so we can slice by
      // `array.length` to get non-index properties
      const nonIndexProperties = Object.keys(array).slice(array.length);
      if (!array.length && !nonIndexProperties.length) return '[]'
      options.truncate -= 4;
      const listContents = inspectList(array, options);
      options.truncate -= listContents.length;
      let propertyContents = '';
      if (nonIndexProperties.length) {
        propertyContents = inspectList(
          nonIndexProperties.map(key => [key, array[key]]),
          options,
          inspectProperty
        );
      }
      return `[ ${listContents}${propertyContents ? `, ${propertyContents}` : ''} ]`
    }

    const getArrayName = array => {
      // We need to special case Node.js' Buffers, which report to be Uint8Array
      if (typeof Buffer === 'function' && array instanceof Buffer) {
        return 'Buffer'
      }
      if (array[Symbol.toStringTag]) {
        return array[Symbol.toStringTag]
      }
      return getFuncName_1(array.constructor)
    };

    function inspectTypedArray(array, options) {
      const name = getArrayName(array);
      options.truncate -= name.length + 4;
      // Object.keys will always output the Array indices first, so we can slice by
      // `array.length` to get non-index properties
      const nonIndexProperties = Object.keys(array).slice(array.length);
      if (!array.length && !nonIndexProperties.length) return `${name}[]`
      // As we know TypedArrays only contain Unsigned Integers, we can skip inspecting each one and simply
      // stylise the toString() value of them
      let output = '';
      for (let i = 0; i < array.length; i++) {
        const string = `${options.stylize(truncate(array[i], options.truncate), 'number')}${
      i === array.length - 1 ? '' : ', '
    }`;
        options.truncate -= string.length;
        if (array[i] !== array.length && options.truncate <= 3) {
          output += `${truncator}(${array.length - array[i] + 1})`;
          break
        }
        output += string;
      }
      let propertyContents = '';
      if (nonIndexProperties.length) {
        propertyContents = inspectList(
          nonIndexProperties.map(key => [key, array[key]]),
          options,
          inspectProperty
        );
      }
      return `${name}[ ${output}${propertyContents ? `, ${propertyContents}` : ''} ]`
    }

    function inspectDate(dateObject, options) {
      // If we need to - truncate the time portion, but never the date
      const split = dateObject.toJSON().split('T');
      const date = split[0];
      return options.stylize(`${date}T${truncate(split[1], options.truncate - date.length - 1)}`, 'date')
    }

    function inspectFunction(func, options) {
      const name = getFuncName_1(func);
      if (!name) {
        return options.stylize('[Function]', 'special')
      }
      return options.stylize(`[Function ${truncate(name, options.truncate - 11)}]`, 'special')
    }

    function inspectMapEntry([key, value], options) {
      options.truncate -= 4;
      key = options.inspect(key, options);
      options.truncate -= key.length;
      value = options.inspect(value, options);
      return `${key} => ${value}`
    }

    // IE11 doesn't support `map.entries()`
    function mapToEntries(map) {
      const entries = [];
      map.forEach((value, key) => {
        entries.push([key, value]);
      });
      return entries
    }

    function inspectMap(map, options) {
      const size = map.size - 1;
      if (size <= 0) {
        return 'Map{}'
      }
      options.truncate -= 7;
      return `Map{ ${inspectList(mapToEntries(map), options, inspectMapEntry)} }`
    }

    const isNaN$2 = Number.isNaN || (i => i !== i); // eslint-disable-line no-self-compare
    function inspectNumber(number, options) {
      if (isNaN$2(number)) {
        return options.stylize('NaN', 'number')
      }
      if (number === Infinity) {
        return options.stylize('Infinity', 'number')
      }
      if (number === -Infinity) {
        return options.stylize('-Infinity', 'number')
      }
      if (number === 0) {
        return options.stylize(1 / number === Infinity ? '+0' : '-0', 'number')
      }
      return options.stylize(truncate(number, options.truncate), 'number')
    }

    function inspectBigInt(number, options) {
      let nums = truncate(number.toString(), options.truncate - 1);
      if (nums !== truncator) nums += 'n';
      return options.stylize(nums, 'bigint')
    }

    function inspectRegExp(value, options) {
      const flags = value.toString().split('/')[2];
      const sourceLength = options.truncate - (2 + flags.length);
      const source = value.source;
      return options.stylize(`/${truncate(source, sourceLength)}/${flags}`, 'regexp')
    }

    // IE11 doesn't support `Array.from(set)`
    function arrayFromSet(set) {
      const values = [];
      set.forEach(value => {
        values.push(value);
      });
      return values
    }

    function inspectSet(set, options) {
      if (set.size === 0) return 'Set{}'
      options.truncate -= 7;
      return `Set{ ${inspectList(arrayFromSet(set), options)} }`
    }

    const stringEscapeChars = new RegExp(
      "['\\u0000-\\u001f\\u007f-\\u009f\\u00ad\\u0600-\\u0604\\u070f\\u17b4\\u17b5" +
        '\\u200c-\\u200f\\u2028-\\u202f\\u2060-\\u206f\\ufeff\\ufff0-\\uffff]',
      'g'
    );

    const escapeCharacters = {
      '\b': '\\b',
      '\t': '\\t',
      '\n': '\\n',
      '\f': '\\f',
      '\r': '\\r',
      "'": "\\'",
      '\\': '\\\\',
    };
    const hex = 16;
    const unicodeLength = 4;
    function escape(char) {
      return escapeCharacters[char] || `\\u${`0000${char.charCodeAt(0).toString(hex)}`.slice(-unicodeLength)}`
    }

    function inspectString(string, options) {
      if (stringEscapeChars.test(string)) {
        string = string.replace(stringEscapeChars, escape);
      }
      return options.stylize(`'${truncate(string, options.truncate - 2)}'`, 'string')
    }

    function inspectSymbol(value) {
      if ('description' in Symbol.prototype) {
        return value.description ? `Symbol(${value.description})` : 'Symbol()'
      }
      return value.toString()
    }

    let getPromiseValue = () => 'Promise{…}';
    try {
      const { getPromiseDetails, kPending, kRejected } = process.binding('util');
      if (Array.isArray(getPromiseDetails(Promise.resolve()))) {
        getPromiseValue = (value, options) => {
          const [state, innerValue] = getPromiseDetails(value);
          if (state === kPending) {
            return 'Promise{<pending>}'
          }
          return `Promise${state === kRejected ? '!' : ''}{${options.inspect(innerValue, options)}}`
        };
      }
    } catch (notNode) {
      /* ignore */
    }
    var inspectPromise = getPromiseValue;

    function inspectObject$1(object, options) {
      const properties = Object.getOwnPropertyNames(object);
      const symbols = Object.getOwnPropertySymbols ? Object.getOwnPropertySymbols(object) : [];
      if (properties.length === 0 && symbols.length === 0) {
        return '{}'
      }
      options.truncate -= 4;
      options.seen = options.seen || [];
      if (options.seen.indexOf(object) >= 0) {
        return '[Circular]'
      }
      options.seen.push(object);
      const propertyContents = inspectList(
        properties.map(key => [key, object[key]]),
        options,
        inspectProperty
      );
      const symbolContents = inspectList(
        symbols.map(key => [key, object[key]]),
        options,
        inspectProperty
      );
      options.seen.pop();
      let sep = '';
      if (propertyContents && symbolContents) {
        sep = ', ';
      }
      return `{ ${propertyContents}${sep}${symbolContents} }`
    }

    const toStringTag = typeof Symbol !== 'undefined' && Symbol.toStringTag ? Symbol.toStringTag : false;

    function inspectClass(value, options) {
      let name = '';
      if (toStringTag && toStringTag in value) {
        name = value[toStringTag];
      }
      name = name || getFuncName_1(value.constructor);
      // Babel transforms anonymous classes to the name `_class`
      if (!name || name === '_class') {
        name = '<Anonymous Class>';
      }
      options.truncate -= name.length;
      return `${name}${inspectObject$1(value, options)}`
    }

    function inspectArguments(args, options) {
      if (args.length === 0) return 'Arguments[]'
      options.truncate -= 13;
      return `Arguments[ ${inspectList(args, options)} ]`
    }

    const errorKeys = [
      'stack',
      'line',
      'column',
      'name',
      'message',
      'fileName',
      'lineNumber',
      'columnNumber',
      'number',
      'description',
    ];

    function inspectObject(error, options) {
      const properties = Object.getOwnPropertyNames(error).filter(key => errorKeys.indexOf(key) === -1);
      const name = error.name;
      options.truncate -= name.length;
      let message = '';
      if (typeof error.message === 'string') {
        message = truncate(error.message, options.truncate);
      } else {
        properties.unshift('message');
      }
      message = message ? `: ${message}` : '';
      options.truncate -= message.length + 5;
      const propertyContents = inspectList(
        properties.map(key => [key, error[key]]),
        options,
        inspectProperty
      );
      return `${name}${message}${propertyContents ? ` { ${propertyContents} }` : ''}`
    }

    function inspectAttribute([key, value], options) {
      options.truncate -= 3;
      if (!value) {
        return `${options.stylize(key, 'yellow')}`
      }
      return `${options.stylize(key, 'yellow')}=${options.stylize(`"${value}"`, 'string')}`
    }

    function inspectHTMLCollection(collection, options) {
      // eslint-disable-next-line no-use-before-define
      return inspectList(collection, options, inspectHTML, '\n')
    }

    function inspectHTML(element, options) {
      const properties = element.getAttributeNames();
      const name = element.tagName.toLowerCase();
      const head = options.stylize(`<${name}`, 'special');
      const headClose = options.stylize(`>`, 'special');
      const tail = options.stylize(`</${name}>`, 'special');
      options.truncate -= name.length * 2 + 5;
      let propertyContents = '';
      if (properties.length > 0) {
        propertyContents += ' ';
        propertyContents += inspectList(
          properties.map(key => [key, element.getAttribute(key)]),
          options,
          inspectAttribute,
          ' '
        );
      }
      options.truncate -= propertyContents.length;
      const truncate = options.truncate;
      let children = inspectHTMLCollection(element.children, options);
      if (children && children.length > truncate) {
        children = `${truncator}(${element.children.length})`;
      }
      return `${head}${propertyContents}${headClose}${children}${tail}`
    }

    /* !
     * loupe
     * Copyright(c) 2013 Jake Luer <jake@alogicalparadox.com>
     * MIT Licensed
     */

    const symbolsSupported = typeof Symbol === 'function' && typeof Symbol.for === 'function';
    const chaiInspect = symbolsSupported ? Symbol.for('chai/inspect') : '@@chai/inspect';
    let nodeInspect = false;
    try {
      // eslint-disable-next-line global-require
      const nodeUtil = require('util');
      nodeInspect = nodeUtil.inspect ? nodeUtil.inspect.custom : false;
    } catch (noNodeInspect) {
      nodeInspect = false;
    }

    const constructorMap = new WeakMap();
    const stringTagMap = {};
    const baseTypesMap = {
      undefined: (value, options) => options.stylize('undefined', 'undefined'),
      null: (value, options) => options.stylize(null, 'null'),

      boolean: (value, options) => options.stylize(value, 'boolean'),
      Boolean: (value, options) => options.stylize(value, 'boolean'),

      number: inspectNumber,
      Number: inspectNumber,

      bigint: inspectBigInt,
      BigInt: inspectBigInt,

      string: inspectString,
      String: inspectString,

      function: inspectFunction,
      Function: inspectFunction,

      symbol: inspectSymbol,
      // A Symbol polyfill will return `Symbol` not `symbol` from typedetect
      Symbol: inspectSymbol,

      Array: inspectArray,
      Date: inspectDate,
      Map: inspectMap,
      Set: inspectSet,
      RegExp: inspectRegExp,
      Promise: inspectPromise,

      // WeakSet, WeakMap are totally opaque to us
      WeakSet: (value, options) => options.stylize('WeakSet{…}', 'special'),
      WeakMap: (value, options) => options.stylize('WeakMap{…}', 'special'),

      Arguments: inspectArguments,
      Int8Array: inspectTypedArray,
      Uint8Array: inspectTypedArray,
      Uint8ClampedArray: inspectTypedArray,
      Int16Array: inspectTypedArray,
      Uint16Array: inspectTypedArray,
      Int32Array: inspectTypedArray,
      Uint32Array: inspectTypedArray,
      Float32Array: inspectTypedArray,
      Float64Array: inspectTypedArray,

      Generator: () => '',
      DataView: () => '',
      ArrayBuffer: () => '',

      Error: inspectObject,

      HTMLCollection: inspectHTMLCollection,
      NodeList: inspectHTMLCollection,
    };

    // eslint-disable-next-line complexity
    const inspectCustom = (value, options, type) => {
      if (chaiInspect in value && typeof value[chaiInspect] === 'function') {
        return value[chaiInspect](options)
      }

      if (nodeInspect && nodeInspect in value && typeof value[nodeInspect] === 'function') {
        return value[nodeInspect](options.depth, options)
      }

      if ('inspect' in value && typeof value.inspect === 'function') {
        return value.inspect(options.depth, options)
      }

      if ('constructor' in value && constructorMap.has(value.constructor)) {
        return constructorMap.get(value.constructor)(value, options)
      }

      if (stringTagMap[type]) {
        return stringTagMap[type](value, options)
      }

      return ''
    };

    const toString = Object.prototype.toString;

    // eslint-disable-next-line complexity
    function inspect$3(value, options) {
      options = normaliseOptions(options);
      options.inspect = inspect$3;
      const { customInspect } = options;
      let type = value === null ? 'null' : typeof value;
      if (type === 'object') {
        type = toString.call(value).slice(8, -1);
      }

      // If it is a base value that we already support, then use Loupe's inspector
      if (baseTypesMap[type]) {
        return baseTypesMap[type](value, options)
      }

      // If `options.customInspect` is set to true then try to use the custom inspector
      if (customInspect && value) {
        const output = inspectCustom(value, options, type);
        if (output) {
          if (typeof output === 'string') return output
          return inspect$3(output, options)
        }
      }

      const proto = value ? Object.getPrototypeOf(value) : false;
      // If it's a plain Object then use Loupe's inspector
      if (proto === Object.prototype || proto === null) {
        return inspectObject$1(value, options)
      }

      // Specifically account for HTMLElements
      // eslint-disable-next-line no-undef
      if (value && typeof HTMLElement === 'function' && value instanceof HTMLElement) {
        return inspectHTML(value, options)
      }

      if ('constructor' in value) {
        // If it is a class, inspect it like an object but add the constructor name
        if (value.constructor !== Object) {
          return inspectClass(value, options)
        }

        // If it is an object with an anonymous prototype, display it as an object.
        return inspectObject$1(value, options)
      }

      // last chance to check if it's an object
      if (value === Object(value)) {
        return inspectObject$1(value, options)
      }

      // We have run out of options! Just stringify the value
      return options.stylize(String(value), type)
    }

    function registerConstructor(constructor, inspector) {
      if (constructorMap.has(constructor)) {
        return false
      }
      constructorMap.add(constructor, inspector);
      return true
    }

    function registerStringTag(stringTag, inspector) {
      if (stringTag in stringTagMap) {
        return false
      }
      stringTagMap[stringTag] = inspector;
      return true
    }

    const custom = chaiInspect;

    var loupe$1 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        inspect: inspect$3,
        registerConstructor: registerConstructor,
        registerStringTag: registerStringTag,
        custom: custom,
        'default': inspect$3
    });

    var require$$1 = /*@__PURE__*/getAugmentedNamespace(loupe$1);

    var config$5 = {

      /**
       * ### config.includeStack
       *
       * User configurable property, influences whether stack trace
       * is included in Assertion error message. Default of false
       * suppresses stack trace in the error message.
       *
       *     chai.config.includeStack = true;  // enable stack on error
       *
       * @param {Boolean}
       * @api public
       */

      includeStack: false,

      /**
       * ### config.showDiff
       *
       * User configurable property, influences whether or not
       * the `showDiff` flag should be included in the thrown
       * AssertionErrors. `false` will always be `false`; `true`
       * will be true when the assertion has requested a diff
       * be shown.
       *
       * @param {Boolean}
       * @api public
       */

      showDiff: true,

      /**
       * ### config.truncateThreshold
       *
       * User configurable property, sets length threshold for actual and
       * expected values in assertion errors. If this threshold is exceeded, for
       * example for large data structures, the value is replaced with something
       * like `[ Array(3) ]` or `{ Object (prop1, prop2) }`.
       *
       * Set it to zero if you want to disable truncating altogether.
       *
       * This is especially userful when doing assertions on arrays: having this
       * set to a reasonable large value makes the failure messages readily
       * inspectable.
       *
       *     chai.config.truncateThreshold = 0;  // disable truncating
       *
       * @param {Number}
       * @api public
       */

      truncateThreshold: 40,

      /**
       * ### config.useProxy
       *
       * User configurable property, defines if chai will use a Proxy to throw
       * an error when a non-existent property is read, which protects users
       * from typos when using property-based assertions.
       *
       * Set it to false if you want to disable this feature.
       *
       *     chai.config.useProxy = false;  // disable use of Proxy
       *
       * This feature is automatically disabled regardless of this config value
       * in environments that don't support proxies.
       *
       * @param {Boolean}
       * @api public
       */

      useProxy: true,

      /**
       * ### config.proxyExcludedKeys
       *
       * User configurable property, defines which properties should be ignored
       * instead of throwing an error if they do not exist on the assertion.
       * This is only applied if the environment Chai is running in supports proxies and
       * if the `useProxy` configuration setting is enabled.
       * By default, `then` and `inspect` will not throw an error if they do not exist on the
       * assertion object because the `.inspect` property is read by `util.inspect` (for example, when
       * using `console.log` on the assertion object) and `.then` is necessary for promise type-checking.
       *
       *     // By default these keys will not throw an error if they do not exist on the assertion object
       *     chai.config.proxyExcludedKeys = ['then', 'inspect'];
       *
       * @param {Array}
       * @api public
       */

      proxyExcludedKeys: ['then', 'catch', 'inspect', 'toJSON']
    };

    var loupe = require$$1;
    var config$4 = config$5;

    var inspect_1 = inspect$2;

    /**
     * ### .inspect(obj, [showHidden], [depth], [colors])
     *
     * Echoes the value of a value. Tries to print the value out
     * in the best way possible given the different types.
     *
     * @param {Object} obj The object to print out.
     * @param {Boolean} showHidden Flag that shows hidden (not enumerable)
     *    properties of objects. Default is false.
     * @param {Number} depth Depth in which to descend in object. Default is 2.
     * @param {Boolean} colors Flag to turn on ANSI escape codes to color the
     *    output. Default is false (no coloring).
     * @namespace Utils
     * @name inspect
     */
    function inspect$2(obj, showHidden, depth, colors) {
      var options = {
        colors: colors,
        depth: (typeof depth === 'undefined' ? 2 : depth),
        showHidden: showHidden,
        truncate: config$4.truncateThreshold ? config$4.truncateThreshold : Infinity,
      };
      return loupe.inspect(obj, options);
    }

    /*!
     * Chai - flag utility
     * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
     * MIT Licensed
     */

    /*!
     * Module dependencies
     */

    var inspect$1 = inspect_1;
    var config$3 = config$5;

    /**
     * ### .objDisplay(object)
     *
     * Determines if an object or an array matches
     * criteria to be inspected in-line for error
     * messages or should be truncated.
     *
     * @param {Mixed} javascript object to inspect
     * @name objDisplay
     * @namespace Utils
     * @api public
     */

    var objDisplay$1 = function objDisplay(obj) {
      var str = inspect$1(obj)
        , type = Object.prototype.toString.call(obj);

      if (config$3.truncateThreshold && str.length >= config$3.truncateThreshold) {
        if (type === '[object Function]') {
          return !obj.name || obj.name === ''
            ? '[Function]'
            : '[Function: ' + obj.name + ']';
        } else if (type === '[object Array]') {
          return '[ Array(' + obj.length + ') ]';
        } else if (type === '[object Object]') {
          var keys = Object.keys(obj)
            , kstr = keys.length > 2
              ? keys.splice(0, 2).join(', ') + ', ...'
              : keys.join(', ');
          return '{ Object (' + kstr + ') }';
        } else {
          return str;
        }
      } else {
        return str;
      }
    };

    /*!
     * Chai - message composition utility
     * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
     * MIT Licensed
     */

    /*!
     * Module dependencies
     */

    var flag$7 = flag$a
      , getActual = getActual$1
      , objDisplay = objDisplay$1;

    /**
     * ### .getMessage(object, message, negateMessage)
     *
     * Construct the error message based on flags
     * and template tags. Template tags will return
     * a stringified inspection of the object referenced.
     *
     * Message template tags:
     * - `#{this}` current asserted object
     * - `#{act}` actual value
     * - `#{exp}` expected value
     *
     * @param {Object} object (constructed Assertion)
     * @param {Arguments} chai.Assertion.prototype.assert arguments
     * @namespace Utils
     * @name getMessage
     * @api public
     */

    var getMessage$1 = function getMessage(obj, args) {
      var negate = flag$7(obj, 'negate')
        , val = flag$7(obj, 'object')
        , expected = args[3]
        , actual = getActual(obj, args)
        , msg = negate ? args[2] : args[1]
        , flagMsg = flag$7(obj, 'message');

      if(typeof msg === "function") msg = msg();
      msg = msg || '';
      msg = msg
        .replace(/#\{this\}/g, function () { return objDisplay(val); })
        .replace(/#\{act\}/g, function () { return objDisplay(actual); })
        .replace(/#\{exp\}/g, function () { return objDisplay(expected); });

      return flagMsg ? flagMsg + ': ' + msg : msg;
    };

    /*!
     * Chai - transferFlags utility
     * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
     * MIT Licensed
     */

    /**
     * ### .transferFlags(assertion, object, includeAll = true)
     *
     * Transfer all the flags for `assertion` to `object`. If
     * `includeAll` is set to `false`, then the base Chai
     * assertion flags (namely `object`, `ssfi`, `lockSsfi`,
     * and `message`) will not be transferred.
     *
     *
     *     var newAssertion = new Assertion();
     *     utils.transferFlags(assertion, newAssertion);
     *
     *     var anotherAssertion = new Assertion(myObj);
     *     utils.transferFlags(assertion, anotherAssertion, false);
     *
     * @param {Assertion} assertion the assertion to transfer the flags from
     * @param {Object} object the object to transfer the flags to; usually a new assertion
     * @param {Boolean} includeAll
     * @namespace Utils
     * @name transferFlags
     * @api private
     */

    var transferFlags$6 = function transferFlags(assertion, object, includeAll) {
      var flags = assertion.__flags || (assertion.__flags = Object.create(null));

      if (!object.__flags) {
        object.__flags = Object.create(null);
      }

      includeAll = arguments.length === 3 ? includeAll : true;

      for (var flag in flags) {
        if (includeAll ||
            (flag !== 'object' && flag !== 'ssfi' && flag !== 'lockSsfi' && flag != 'message')) {
          object.__flags[flag] = flags[flag];
        }
      }
    };

    var deepEql = {exports: {}};

    /* globals Symbol: false, Uint8Array: false, WeakMap: false */
    /*!
     * deep-eql
     * Copyright(c) 2013 Jake Luer <jake@alogicalparadox.com>
     * MIT Licensed
     */

    var type$1 = typeDetect.exports;
    function FakeMap() {
      this._key = 'chai/deep-eql__' + Math.random() + Date.now();
    }

    FakeMap.prototype = {
      get: function getMap(key) {
        return key[this._key];
      },
      set: function setMap(key, value) {
        if (Object.isExtensible(key)) {
          Object.defineProperty(key, this._key, {
            value: value,
            configurable: true,
          });
        }
      },
    };

    var MemoizeMap = typeof WeakMap === 'function' ? WeakMap : FakeMap;
    /*!
     * Check to see if the MemoizeMap has recorded a result of the two operands
     *
     * @param {Mixed} leftHandOperand
     * @param {Mixed} rightHandOperand
     * @param {MemoizeMap} memoizeMap
     * @returns {Boolean|null} result
    */
    function memoizeCompare(leftHandOperand, rightHandOperand, memoizeMap) {
      // Technically, WeakMap keys can *only* be objects, not primitives.
      if (!memoizeMap || isPrimitive(leftHandOperand) || isPrimitive(rightHandOperand)) {
        return null;
      }
      var leftHandMap = memoizeMap.get(leftHandOperand);
      if (leftHandMap) {
        var result = leftHandMap.get(rightHandOperand);
        if (typeof result === 'boolean') {
          return result;
        }
      }
      return null;
    }

    /*!
     * Set the result of the equality into the MemoizeMap
     *
     * @param {Mixed} leftHandOperand
     * @param {Mixed} rightHandOperand
     * @param {MemoizeMap} memoizeMap
     * @param {Boolean} result
    */
    function memoizeSet(leftHandOperand, rightHandOperand, memoizeMap, result) {
      // Technically, WeakMap keys can *only* be objects, not primitives.
      if (!memoizeMap || isPrimitive(leftHandOperand) || isPrimitive(rightHandOperand)) {
        return;
      }
      var leftHandMap = memoizeMap.get(leftHandOperand);
      if (leftHandMap) {
        leftHandMap.set(rightHandOperand, result);
      } else {
        leftHandMap = new MemoizeMap();
        leftHandMap.set(rightHandOperand, result);
        memoizeMap.set(leftHandOperand, leftHandMap);
      }
    }

    /*!
     * Primary Export
     */

    deepEql.exports = deepEqual;
    deepEql.exports.MemoizeMap = MemoizeMap;

    /**
     * Assert deeply nested sameValue equality between two objects of any type.
     *
     * @param {Mixed} leftHandOperand
     * @param {Mixed} rightHandOperand
     * @param {Object} [options] (optional) Additional options
     * @param {Array} [options.comparator] (optional) Override default algorithm, determining custom equality.
     * @param {Array} [options.memoize] (optional) Provide a custom memoization object which will cache the results of
        complex objects for a speed boost. By passing `false` you can disable memoization, but this will cause circular
        references to blow the stack.
     * @return {Boolean} equal match
     */
    function deepEqual(leftHandOperand, rightHandOperand, options) {
      // If we have a comparator, we can't assume anything; so bail to its check first.
      if (options && options.comparator) {
        return extensiveDeepEqual(leftHandOperand, rightHandOperand, options);
      }

      var simpleResult = simpleEqual(leftHandOperand, rightHandOperand);
      if (simpleResult !== null) {
        return simpleResult;
      }

      // Deeper comparisons are pushed through to a larger function
      return extensiveDeepEqual(leftHandOperand, rightHandOperand, options);
    }

    /**
     * Many comparisons can be canceled out early via simple equality or primitive checks.
     * @param {Mixed} leftHandOperand
     * @param {Mixed} rightHandOperand
     * @return {Boolean|null} equal match
     */
    function simpleEqual(leftHandOperand, rightHandOperand) {
      // Equal references (except for Numbers) can be returned early
      if (leftHandOperand === rightHandOperand) {
        // Handle +-0 cases
        return leftHandOperand !== 0 || 1 / leftHandOperand === 1 / rightHandOperand;
      }

      // handle NaN cases
      if (
        leftHandOperand !== leftHandOperand && // eslint-disable-line no-self-compare
        rightHandOperand !== rightHandOperand // eslint-disable-line no-self-compare
      ) {
        return true;
      }

      // Anything that is not an 'object', i.e. symbols, functions, booleans, numbers,
      // strings, and undefined, can be compared by reference.
      if (isPrimitive(leftHandOperand) || isPrimitive(rightHandOperand)) {
        // Easy out b/c it would have passed the first equality check
        return false;
      }
      return null;
    }

    /*!
     * The main logic of the `deepEqual` function.
     *
     * @param {Mixed} leftHandOperand
     * @param {Mixed} rightHandOperand
     * @param {Object} [options] (optional) Additional options
     * @param {Array} [options.comparator] (optional) Override default algorithm, determining custom equality.
     * @param {Array} [options.memoize] (optional) Provide a custom memoization object which will cache the results of
        complex objects for a speed boost. By passing `false` you can disable memoization, but this will cause circular
        references to blow the stack.
     * @return {Boolean} equal match
    */
    function extensiveDeepEqual(leftHandOperand, rightHandOperand, options) {
      options = options || {};
      options.memoize = options.memoize === false ? false : options.memoize || new MemoizeMap();
      var comparator = options && options.comparator;

      // Check if a memoized result exists.
      var memoizeResultLeft = memoizeCompare(leftHandOperand, rightHandOperand, options.memoize);
      if (memoizeResultLeft !== null) {
        return memoizeResultLeft;
      }
      var memoizeResultRight = memoizeCompare(rightHandOperand, leftHandOperand, options.memoize);
      if (memoizeResultRight !== null) {
        return memoizeResultRight;
      }

      // If a comparator is present, use it.
      if (comparator) {
        var comparatorResult = comparator(leftHandOperand, rightHandOperand);
        // Comparators may return null, in which case we want to go back to default behavior.
        if (comparatorResult === false || comparatorResult === true) {
          memoizeSet(leftHandOperand, rightHandOperand, options.memoize, comparatorResult);
          return comparatorResult;
        }
        // To allow comparators to override *any* behavior, we ran them first. Since it didn't decide
        // what to do, we need to make sure to return the basic tests first before we move on.
        var simpleResult = simpleEqual(leftHandOperand, rightHandOperand);
        if (simpleResult !== null) {
          // Don't memoize this, it takes longer to set/retrieve than to just compare.
          return simpleResult;
        }
      }

      var leftHandType = type$1(leftHandOperand);
      if (leftHandType !== type$1(rightHandOperand)) {
        memoizeSet(leftHandOperand, rightHandOperand, options.memoize, false);
        return false;
      }

      // Temporarily set the operands in the memoize object to prevent blowing the stack
      memoizeSet(leftHandOperand, rightHandOperand, options.memoize, true);

      var result = extensiveDeepEqualByType(leftHandOperand, rightHandOperand, leftHandType, options);
      memoizeSet(leftHandOperand, rightHandOperand, options.memoize, result);
      return result;
    }

    function extensiveDeepEqualByType(leftHandOperand, rightHandOperand, leftHandType, options) {
      switch (leftHandType) {
        case 'String':
        case 'Number':
        case 'Boolean':
        case 'Date':
          // If these types are their instance types (e.g. `new Number`) then re-deepEqual against their values
          return deepEqual(leftHandOperand.valueOf(), rightHandOperand.valueOf());
        case 'Promise':
        case 'Symbol':
        case 'function':
        case 'WeakMap':
        case 'WeakSet':
        case 'Error':
          return leftHandOperand === rightHandOperand;
        case 'Arguments':
        case 'Int8Array':
        case 'Uint8Array':
        case 'Uint8ClampedArray':
        case 'Int16Array':
        case 'Uint16Array':
        case 'Int32Array':
        case 'Uint32Array':
        case 'Float32Array':
        case 'Float64Array':
        case 'Array':
          return iterableEqual(leftHandOperand, rightHandOperand, options);
        case 'RegExp':
          return regexpEqual(leftHandOperand, rightHandOperand);
        case 'Generator':
          return generatorEqual(leftHandOperand, rightHandOperand, options);
        case 'DataView':
          return iterableEqual(new Uint8Array(leftHandOperand.buffer), new Uint8Array(rightHandOperand.buffer), options);
        case 'ArrayBuffer':
          return iterableEqual(new Uint8Array(leftHandOperand), new Uint8Array(rightHandOperand), options);
        case 'Set':
          return entriesEqual(leftHandOperand, rightHandOperand, options);
        case 'Map':
          return entriesEqual(leftHandOperand, rightHandOperand, options);
        default:
          return objectEqual(leftHandOperand, rightHandOperand, options);
      }
    }

    /*!
     * Compare two Regular Expressions for equality.
     *
     * @param {RegExp} leftHandOperand
     * @param {RegExp} rightHandOperand
     * @return {Boolean} result
     */

    function regexpEqual(leftHandOperand, rightHandOperand) {
      return leftHandOperand.toString() === rightHandOperand.toString();
    }

    /*!
     * Compare two Sets/Maps for equality. Faster than other equality functions.
     *
     * @param {Set} leftHandOperand
     * @param {Set} rightHandOperand
     * @param {Object} [options] (Optional)
     * @return {Boolean} result
     */

    function entriesEqual(leftHandOperand, rightHandOperand, options) {
      // IE11 doesn't support Set#entries or Set#@@iterator, so we need manually populate using Set#forEach
      if (leftHandOperand.size !== rightHandOperand.size) {
        return false;
      }
      if (leftHandOperand.size === 0) {
        return true;
      }
      var leftHandItems = [];
      var rightHandItems = [];
      leftHandOperand.forEach(function gatherEntries(key, value) {
        leftHandItems.push([ key, value ]);
      });
      rightHandOperand.forEach(function gatherEntries(key, value) {
        rightHandItems.push([ key, value ]);
      });
      return iterableEqual(leftHandItems.sort(), rightHandItems.sort(), options);
    }

    /*!
     * Simple equality for flat iterable objects such as Arrays, TypedArrays or Node.js buffers.
     *
     * @param {Iterable} leftHandOperand
     * @param {Iterable} rightHandOperand
     * @param {Object} [options] (Optional)
     * @return {Boolean} result
     */

    function iterableEqual(leftHandOperand, rightHandOperand, options) {
      var length = leftHandOperand.length;
      if (length !== rightHandOperand.length) {
        return false;
      }
      if (length === 0) {
        return true;
      }
      var index = -1;
      while (++index < length) {
        if (deepEqual(leftHandOperand[index], rightHandOperand[index], options) === false) {
          return false;
        }
      }
      return true;
    }

    /*!
     * Simple equality for generator objects such as those returned by generator functions.
     *
     * @param {Iterable} leftHandOperand
     * @param {Iterable} rightHandOperand
     * @param {Object} [options] (Optional)
     * @return {Boolean} result
     */

    function generatorEqual(leftHandOperand, rightHandOperand, options) {
      return iterableEqual(getGeneratorEntries(leftHandOperand), getGeneratorEntries(rightHandOperand), options);
    }

    /*!
     * Determine if the given object has an @@iterator function.
     *
     * @param {Object} target
     * @return {Boolean} `true` if the object has an @@iterator function.
     */
    function hasIteratorFunction(target) {
      return typeof Symbol !== 'undefined' &&
        typeof target === 'object' &&
        typeof Symbol.iterator !== 'undefined' &&
        typeof target[Symbol.iterator] === 'function';
    }

    /*!
     * Gets all iterator entries from the given Object. If the Object has no @@iterator function, returns an empty array.
     * This will consume the iterator - which could have side effects depending on the @@iterator implementation.
     *
     * @param {Object} target
     * @returns {Array} an array of entries from the @@iterator function
     */
    function getIteratorEntries(target) {
      if (hasIteratorFunction(target)) {
        try {
          return getGeneratorEntries(target[Symbol.iterator]());
        } catch (iteratorError) {
          return [];
        }
      }
      return [];
    }

    /*!
     * Gets all entries from a Generator. This will consume the generator - which could have side effects.
     *
     * @param {Generator} target
     * @returns {Array} an array of entries from the Generator.
     */
    function getGeneratorEntries(generator) {
      var generatorResult = generator.next();
      var accumulator = [ generatorResult.value ];
      while (generatorResult.done === false) {
        generatorResult = generator.next();
        accumulator.push(generatorResult.value);
      }
      return accumulator;
    }

    /*!
     * Gets all own and inherited enumerable keys from a target.
     *
     * @param {Object} target
     * @returns {Array} an array of own and inherited enumerable keys from the target.
     */
    function getEnumerableKeys(target) {
      var keys = [];
      for (var key in target) {
        keys.push(key);
      }
      return keys;
    }

    /*!
     * Determines if two objects have matching values, given a set of keys. Defers to deepEqual for the equality check of
     * each key. If any value of the given key is not equal, the function will return false (early).
     *
     * @param {Mixed} leftHandOperand
     * @param {Mixed} rightHandOperand
     * @param {Array} keys An array of keys to compare the values of leftHandOperand and rightHandOperand against
     * @param {Object} [options] (Optional)
     * @return {Boolean} result
     */
    function keysEqual(leftHandOperand, rightHandOperand, keys, options) {
      var length = keys.length;
      if (length === 0) {
        return true;
      }
      for (var i = 0; i < length; i += 1) {
        if (deepEqual(leftHandOperand[keys[i]], rightHandOperand[keys[i]], options) === false) {
          return false;
        }
      }
      return true;
    }

    /*!
     * Recursively check the equality of two Objects. Once basic sameness has been established it will defer to `deepEqual`
     * for each enumerable key in the object.
     *
     * @param {Mixed} leftHandOperand
     * @param {Mixed} rightHandOperand
     * @param {Object} [options] (Optional)
     * @return {Boolean} result
     */

    function objectEqual(leftHandOperand, rightHandOperand, options) {
      var leftHandKeys = getEnumerableKeys(leftHandOperand);
      var rightHandKeys = getEnumerableKeys(rightHandOperand);
      if (leftHandKeys.length && leftHandKeys.length === rightHandKeys.length) {
        leftHandKeys.sort();
        rightHandKeys.sort();
        if (iterableEqual(leftHandKeys, rightHandKeys) === false) {
          return false;
        }
        return keysEqual(leftHandOperand, rightHandOperand, leftHandKeys, options);
      }

      var leftHandEntries = getIteratorEntries(leftHandOperand);
      var rightHandEntries = getIteratorEntries(rightHandOperand);
      if (leftHandEntries.length && leftHandEntries.length === rightHandEntries.length) {
        leftHandEntries.sort();
        rightHandEntries.sort();
        return iterableEqual(leftHandEntries, rightHandEntries, options);
      }

      if (leftHandKeys.length === 0 &&
          leftHandEntries.length === 0 &&
          rightHandKeys.length === 0 &&
          rightHandEntries.length === 0) {
        return true;
      }

      return false;
    }

    /*!
     * Returns true if the argument is a primitive.
     *
     * This intentionally returns true for all objects that can be compared by reference,
     * including functions and symbols.
     *
     * @param {Mixed} value
     * @return {Boolean} result
     */
    function isPrimitive(value) {
      return value === null || typeof value !== 'object';
    }

    var config$2 = config$5;

    /*!
     * Chai - isProxyEnabled helper
     * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
     * MIT Licensed
     */

    /**
     * ### .isProxyEnabled()
     *
     * Helper function to check if Chai's proxy protection feature is enabled. If
     * proxies are unsupported or disabled via the user's Chai config, then return
     * false. Otherwise, return true.
     *
     * @namespace Utils
     * @name isProxyEnabled
     */

    var isProxyEnabled$3 = function isProxyEnabled() {
      return config$2.useProxy &&
        typeof Proxy !== 'undefined' &&
        typeof Reflect !== 'undefined';
    };

    /*!
     * Chai - addProperty utility
     * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
     * MIT Licensed
     */

    var chai$6 = chai$7;
    var flag$6 = flag$a;
    var isProxyEnabled$2 = isProxyEnabled$3;
    var transferFlags$5 = transferFlags$6;

    /**
     * ### .addProperty(ctx, name, getter)
     *
     * Adds a property to the prototype of an object.
     *
     *     utils.addProperty(chai.Assertion.prototype, 'foo', function () {
     *       var obj = utils.flag(this, 'object');
     *       new chai.Assertion(obj).to.be.instanceof(Foo);
     *     });
     *
     * Can also be accessed directly from `chai.Assertion`.
     *
     *     chai.Assertion.addProperty('foo', fn);
     *
     * Then can be used as any other assertion.
     *
     *     expect(myFoo).to.be.foo;
     *
     * @param {Object} ctx object to which the property is added
     * @param {String} name of property to add
     * @param {Function} getter function to be used for name
     * @namespace Utils
     * @name addProperty
     * @api public
     */

    var addProperty = function addProperty(ctx, name, getter) {
      getter = getter === undefined ? function () {} : getter;

      Object.defineProperty(ctx, name,
        { get: function propertyGetter() {
            // Setting the `ssfi` flag to `propertyGetter` causes this function to
            // be the starting point for removing implementation frames from the
            // stack trace of a failed assertion.
            //
            // However, we only want to use this function as the starting point if
            // the `lockSsfi` flag isn't set and proxy protection is disabled.
            //
            // If the `lockSsfi` flag is set, then either this assertion has been
            // overwritten by another assertion, or this assertion is being invoked
            // from inside of another assertion. In the first case, the `ssfi` flag
            // has already been set by the overwriting assertion. In the second
            // case, the `ssfi` flag has already been set by the outer assertion.
            //
            // If proxy protection is enabled, then the `ssfi` flag has already been
            // set by the proxy getter.
            if (!isProxyEnabled$2() && !flag$6(this, 'lockSsfi')) {
              flag$6(this, 'ssfi', propertyGetter);
            }

            var result = getter.call(this);
            if (result !== undefined)
              return result;

            var newAssertion = new chai$6.Assertion();
            transferFlags$5(this, newAssertion);
            return newAssertion;
          }
        , configurable: true
      });
    };

    var fnLengthDesc = Object.getOwnPropertyDescriptor(function () {}, 'length');

    /*!
     * Chai - addLengthGuard utility
     * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
     * MIT Licensed
     */

    /**
     * ### .addLengthGuard(fn, assertionName, isChainable)
     *
     * Define `length` as a getter on the given uninvoked method assertion. The
     * getter acts as a guard against chaining `length` directly off of an uninvoked
     * method assertion, which is a problem because it references `function`'s
     * built-in `length` property instead of Chai's `length` assertion. When the
     * getter catches the user making this mistake, it throws an error with a
     * helpful message.
     *
     * There are two ways in which this mistake can be made. The first way is by
     * chaining the `length` assertion directly off of an uninvoked chainable
     * method. In this case, Chai suggests that the user use `lengthOf` instead. The
     * second way is by chaining the `length` assertion directly off of an uninvoked
     * non-chainable method. Non-chainable methods must be invoked prior to
     * chaining. In this case, Chai suggests that the user consult the docs for the
     * given assertion.
     *
     * If the `length` property of functions is unconfigurable, then return `fn`
     * without modification.
     *
     * Note that in ES6, the function's `length` property is configurable, so once
     * support for legacy environments is dropped, Chai's `length` property can
     * replace the built-in function's `length` property, and this length guard will
     * no longer be necessary. In the mean time, maintaining consistency across all
     * environments is the priority.
     *
     * @param {Function} fn
     * @param {String} assertionName
     * @param {Boolean} isChainable
     * @namespace Utils
     * @name addLengthGuard
     */

    var addLengthGuard$3 = function addLengthGuard (fn, assertionName, isChainable) {
      if (!fnLengthDesc.configurable) return fn;

      Object.defineProperty(fn, 'length', {
        get: function () {
          if (isChainable) {
            throw Error('Invalid Chai property: ' + assertionName + '.length. Due' +
              ' to a compatibility issue, "length" cannot directly follow "' +
              assertionName + '". Use "' + assertionName + '.lengthOf" instead.');
          }

          throw Error('Invalid Chai property: ' + assertionName + '.length. See' +
            ' docs for proper usage of "' + assertionName + '".');
        }
      });

      return fn;
    };

    /*!
     * Chai - getProperties utility
     * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
     * MIT Licensed
     */

    /**
     * ### .getProperties(object)
     *
     * This allows the retrieval of property names of an object, enumerable or not,
     * inherited or not.
     *
     * @param {Object} object
     * @returns {Array}
     * @namespace Utils
     * @name getProperties
     * @api public
     */

    var getProperties$1 = function getProperties(object) {
      var result = Object.getOwnPropertyNames(object);

      function addProperty(property) {
        if (result.indexOf(property) === -1) {
          result.push(property);
        }
      }

      var proto = Object.getPrototypeOf(object);
      while (proto !== null) {
        Object.getOwnPropertyNames(proto).forEach(addProperty);
        proto = Object.getPrototypeOf(proto);
      }

      return result;
    };

    var config$1 = config$5;
    var flag$5 = flag$a;
    var getProperties = getProperties$1;
    var isProxyEnabled$1 = isProxyEnabled$3;

    /*!
     * Chai - proxify utility
     * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
     * MIT Licensed
     */

    /**
     * ### .proxify(object)
     *
     * Return a proxy of given object that throws an error when a non-existent
     * property is read. By default, the root cause is assumed to be a misspelled
     * property, and thus an attempt is made to offer a reasonable suggestion from
     * the list of existing properties. However, if a nonChainableMethodName is
     * provided, then the root cause is instead a failure to invoke a non-chainable
     * method prior to reading the non-existent property.
     *
     * If proxies are unsupported or disabled via the user's Chai config, then
     * return object without modification.
     *
     * @param {Object} obj
     * @param {String} nonChainableMethodName
     * @namespace Utils
     * @name proxify
     */

    var builtins = ['__flags', '__methods', '_obj', 'assert'];

    var proxify$3 = function proxify(obj, nonChainableMethodName) {
      if (!isProxyEnabled$1()) return obj;

      return new Proxy(obj, {
        get: function proxyGetter(target, property) {
          // This check is here because we should not throw errors on Symbol properties
          // such as `Symbol.toStringTag`.
          // The values for which an error should be thrown can be configured using
          // the `config.proxyExcludedKeys` setting.
          if (typeof property === 'string' &&
              config$1.proxyExcludedKeys.indexOf(property) === -1 &&
              !Reflect.has(target, property)) {
            // Special message for invalid property access of non-chainable methods.
            if (nonChainableMethodName) {
              throw Error('Invalid Chai property: ' + nonChainableMethodName + '.' +
                property + '. See docs for proper usage of "' +
                nonChainableMethodName + '".');
            }

            // If the property is reasonably close to an existing Chai property,
            // suggest that property to the user. Only suggest properties with a
            // distance less than 4.
            var suggestion = null;
            var suggestionDistance = 4;
            getProperties(target).forEach(function(prop) {
              if (
                !Object.prototype.hasOwnProperty(prop) &&
                builtins.indexOf(prop) === -1
              ) {
                var dist = stringDistanceCapped(
                  property,
                  prop,
                  suggestionDistance
                );
                if (dist < suggestionDistance) {
                  suggestion = prop;
                  suggestionDistance = dist;
                }
              }
            });

            if (suggestion !== null) {
              throw Error('Invalid Chai property: ' + property +
                '. Did you mean "' + suggestion + '"?');
            } else {
              throw Error('Invalid Chai property: ' + property);
            }
          }

          // Use this proxy getter as the starting point for removing implementation
          // frames from the stack trace of a failed assertion. For property
          // assertions, this prevents the proxy getter from showing up in the stack
          // trace since it's invoked before the property getter. For method and
          // chainable method assertions, this flag will end up getting changed to
          // the method wrapper, which is good since this frame will no longer be in
          // the stack once the method is invoked. Note that Chai builtin assertion
          // properties such as `__flags` are skipped since this is only meant to
          // capture the starting point of an assertion. This step is also skipped
          // if the `lockSsfi` flag is set, thus indicating that this assertion is
          // being called from within another assertion. In that case, the `ssfi`
          // flag is already set to the outer assertion's starting point.
          if (builtins.indexOf(property) === -1 && !flag$5(target, 'lockSsfi')) {
            flag$5(target, 'ssfi', proxyGetter);
          }

          return Reflect.get(target, property);
        }
      });
    };

    /**
     * # stringDistanceCapped(strA, strB, cap)
     * Return the Levenshtein distance between two strings, but no more than cap.
     * @param {string} strA
     * @param {string} strB
     * @param {number} number
     * @return {number} min(string distance between strA and strB, cap)
     * @api private
     */

    function stringDistanceCapped(strA, strB, cap) {
      if (Math.abs(strA.length - strB.length) >= cap) {
        return cap;
      }

      var memo = [];
      // `memo` is a two-dimensional array containing distances.
      // memo[i][j] is the distance between strA.slice(0, i) and
      // strB.slice(0, j).
      for (var i = 0; i <= strA.length; i++) {
        memo[i] = Array(strB.length + 1).fill(0);
        memo[i][0] = i;
      }
      for (var j = 0; j < strB.length; j++) {
        memo[0][j] = j;
      }

      for (var i = 1; i <= strA.length; i++) {
        var ch = strA.charCodeAt(i - 1);
        for (var j = 1; j <= strB.length; j++) {
          if (Math.abs(i - j) >= cap) {
            memo[i][j] = cap;
            continue;
          }
          memo[i][j] = Math.min(
            memo[i - 1][j] + 1,
            memo[i][j - 1] + 1,
            memo[i - 1][j - 1] +
              (ch === strB.charCodeAt(j - 1) ? 0 : 1)
          );
        }
      }

      return memo[strA.length][strB.length];
    }

    /*!
     * Chai - addMethod utility
     * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
     * MIT Licensed
     */

    var addLengthGuard$2 = addLengthGuard$3;
    var chai$5 = chai$7;
    var flag$4 = flag$a;
    var proxify$2 = proxify$3;
    var transferFlags$4 = transferFlags$6;

    /**
     * ### .addMethod(ctx, name, method)
     *
     * Adds a method to the prototype of an object.
     *
     *     utils.addMethod(chai.Assertion.prototype, 'foo', function (str) {
     *       var obj = utils.flag(this, 'object');
     *       new chai.Assertion(obj).to.be.equal(str);
     *     });
     *
     * Can also be accessed directly from `chai.Assertion`.
     *
     *     chai.Assertion.addMethod('foo', fn);
     *
     * Then can be used as any other assertion.
     *
     *     expect(fooStr).to.be.foo('bar');
     *
     * @param {Object} ctx object to which the method is added
     * @param {String} name of method to add
     * @param {Function} method function to be used for name
     * @namespace Utils
     * @name addMethod
     * @api public
     */

    var addMethod = function addMethod(ctx, name, method) {
      var methodWrapper = function () {
        // Setting the `ssfi` flag to `methodWrapper` causes this function to be the
        // starting point for removing implementation frames from the stack trace of
        // a failed assertion.
        //
        // However, we only want to use this function as the starting point if the
        // `lockSsfi` flag isn't set.
        //
        // If the `lockSsfi` flag is set, then either this assertion has been
        // overwritten by another assertion, or this assertion is being invoked from
        // inside of another assertion. In the first case, the `ssfi` flag has
        // already been set by the overwriting assertion. In the second case, the
        // `ssfi` flag has already been set by the outer assertion.
        if (!flag$4(this, 'lockSsfi')) {
          flag$4(this, 'ssfi', methodWrapper);
        }

        var result = method.apply(this, arguments);
        if (result !== undefined)
          return result;

        var newAssertion = new chai$5.Assertion();
        transferFlags$4(this, newAssertion);
        return newAssertion;
      };

      addLengthGuard$2(methodWrapper, name, false);
      ctx[name] = proxify$2(methodWrapper, name);
    };

    /*!
     * Chai - overwriteProperty utility
     * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
     * MIT Licensed
     */

    var chai$4 = chai$7;
    var flag$3 = flag$a;
    var isProxyEnabled = isProxyEnabled$3;
    var transferFlags$3 = transferFlags$6;

    /**
     * ### .overwriteProperty(ctx, name, fn)
     *
     * Overwrites an already existing property getter and provides
     * access to previous value. Must return function to use as getter.
     *
     *     utils.overwriteProperty(chai.Assertion.prototype, 'ok', function (_super) {
     *       return function () {
     *         var obj = utils.flag(this, 'object');
     *         if (obj instanceof Foo) {
     *           new chai.Assertion(obj.name).to.equal('bar');
     *         } else {
     *           _super.call(this);
     *         }
     *       }
     *     });
     *
     *
     * Can also be accessed directly from `chai.Assertion`.
     *
     *     chai.Assertion.overwriteProperty('foo', fn);
     *
     * Then can be used as any other assertion.
     *
     *     expect(myFoo).to.be.ok;
     *
     * @param {Object} ctx object whose property is to be overwritten
     * @param {String} name of property to overwrite
     * @param {Function} getter function that returns a getter function to be used for name
     * @namespace Utils
     * @name overwriteProperty
     * @api public
     */

    var overwriteProperty = function overwriteProperty(ctx, name, getter) {
      var _get = Object.getOwnPropertyDescriptor(ctx, name)
        , _super = function () {};

      if (_get && 'function' === typeof _get.get)
        _super = _get.get;

      Object.defineProperty(ctx, name,
        { get: function overwritingPropertyGetter() {
            // Setting the `ssfi` flag to `overwritingPropertyGetter` causes this
            // function to be the starting point for removing implementation frames
            // from the stack trace of a failed assertion.
            //
            // However, we only want to use this function as the starting point if
            // the `lockSsfi` flag isn't set and proxy protection is disabled.
            //
            // If the `lockSsfi` flag is set, then either this assertion has been
            // overwritten by another assertion, or this assertion is being invoked
            // from inside of another assertion. In the first case, the `ssfi` flag
            // has already been set by the overwriting assertion. In the second
            // case, the `ssfi` flag has already been set by the outer assertion.
            //
            // If proxy protection is enabled, then the `ssfi` flag has already been
            // set by the proxy getter.
            if (!isProxyEnabled() && !flag$3(this, 'lockSsfi')) {
              flag$3(this, 'ssfi', overwritingPropertyGetter);
            }

            // Setting the `lockSsfi` flag to `true` prevents the overwritten
            // assertion from changing the `ssfi` flag. By this point, the `ssfi`
            // flag is already set to the correct starting point for this assertion.
            var origLockSsfi = flag$3(this, 'lockSsfi');
            flag$3(this, 'lockSsfi', true);
            var result = getter(_super).call(this);
            flag$3(this, 'lockSsfi', origLockSsfi);

            if (result !== undefined) {
              return result;
            }

            var newAssertion = new chai$4.Assertion();
            transferFlags$3(this, newAssertion);
            return newAssertion;
          }
        , configurable: true
      });
    };

    /*!
     * Chai - overwriteMethod utility
     * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
     * MIT Licensed
     */

    var addLengthGuard$1 = addLengthGuard$3;
    var chai$3 = chai$7;
    var flag$2 = flag$a;
    var proxify$1 = proxify$3;
    var transferFlags$2 = transferFlags$6;

    /**
     * ### .overwriteMethod(ctx, name, fn)
     *
     * Overwrites an already existing method and provides
     * access to previous function. Must return function
     * to be used for name.
     *
     *     utils.overwriteMethod(chai.Assertion.prototype, 'equal', function (_super) {
     *       return function (str) {
     *         var obj = utils.flag(this, 'object');
     *         if (obj instanceof Foo) {
     *           new chai.Assertion(obj.value).to.equal(str);
     *         } else {
     *           _super.apply(this, arguments);
     *         }
     *       }
     *     });
     *
     * Can also be accessed directly from `chai.Assertion`.
     *
     *     chai.Assertion.overwriteMethod('foo', fn);
     *
     * Then can be used as any other assertion.
     *
     *     expect(myFoo).to.equal('bar');
     *
     * @param {Object} ctx object whose method is to be overwritten
     * @param {String} name of method to overwrite
     * @param {Function} method function that returns a function to be used for name
     * @namespace Utils
     * @name overwriteMethod
     * @api public
     */

    var overwriteMethod = function overwriteMethod(ctx, name, method) {
      var _method = ctx[name]
        , _super = function () {
          throw new Error(name + ' is not a function');
        };

      if (_method && 'function' === typeof _method)
        _super = _method;

      var overwritingMethodWrapper = function () {
        // Setting the `ssfi` flag to `overwritingMethodWrapper` causes this
        // function to be the starting point for removing implementation frames from
        // the stack trace of a failed assertion.
        //
        // However, we only want to use this function as the starting point if the
        // `lockSsfi` flag isn't set.
        //
        // If the `lockSsfi` flag is set, then either this assertion has been
        // overwritten by another assertion, or this assertion is being invoked from
        // inside of another assertion. In the first case, the `ssfi` flag has
        // already been set by the overwriting assertion. In the second case, the
        // `ssfi` flag has already been set by the outer assertion.
        if (!flag$2(this, 'lockSsfi')) {
          flag$2(this, 'ssfi', overwritingMethodWrapper);
        }

        // Setting the `lockSsfi` flag to `true` prevents the overwritten assertion
        // from changing the `ssfi` flag. By this point, the `ssfi` flag is already
        // set to the correct starting point for this assertion.
        var origLockSsfi = flag$2(this, 'lockSsfi');
        flag$2(this, 'lockSsfi', true);
        var result = method(_super).apply(this, arguments);
        flag$2(this, 'lockSsfi', origLockSsfi);

        if (result !== undefined) {
          return result;
        }

        var newAssertion = new chai$3.Assertion();
        transferFlags$2(this, newAssertion);
        return newAssertion;
      };

      addLengthGuard$1(overwritingMethodWrapper, name, false);
      ctx[name] = proxify$1(overwritingMethodWrapper, name);
    };

    /*!
     * Chai - addChainingMethod utility
     * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
     * MIT Licensed
     */

    /*!
     * Module dependencies
     */

    var addLengthGuard = addLengthGuard$3;
    var chai$2 = chai$7;
    var flag$1 = flag$a;
    var proxify = proxify$3;
    var transferFlags$1 = transferFlags$6;

    /*!
     * Module variables
     */

    // Check whether `Object.setPrototypeOf` is supported
    var canSetPrototype = typeof Object.setPrototypeOf === 'function';

    // Without `Object.setPrototypeOf` support, this module will need to add properties to a function.
    // However, some of functions' own props are not configurable and should be skipped.
    var testFn = function() {};
    var excludeNames = Object.getOwnPropertyNames(testFn).filter(function(name) {
      var propDesc = Object.getOwnPropertyDescriptor(testFn, name);

      // Note: PhantomJS 1.x includes `callee` as one of `testFn`'s own properties,
      // but then returns `undefined` as the property descriptor for `callee`. As a
      // workaround, we perform an otherwise unnecessary type-check for `propDesc`,
      // and then filter it out if it's not an object as it should be.
      if (typeof propDesc !== 'object')
        return true;

      return !propDesc.configurable;
    });

    // Cache `Function` properties
    var call  = Function.prototype.call,
        apply = Function.prototype.apply;

    /**
     * ### .addChainableMethod(ctx, name, method, chainingBehavior)
     *
     * Adds a method to an object, such that the method can also be chained.
     *
     *     utils.addChainableMethod(chai.Assertion.prototype, 'foo', function (str) {
     *       var obj = utils.flag(this, 'object');
     *       new chai.Assertion(obj).to.be.equal(str);
     *     });
     *
     * Can also be accessed directly from `chai.Assertion`.
     *
     *     chai.Assertion.addChainableMethod('foo', fn, chainingBehavior);
     *
     * The result can then be used as both a method assertion, executing both `method` and
     * `chainingBehavior`, or as a language chain, which only executes `chainingBehavior`.
     *
     *     expect(fooStr).to.be.foo('bar');
     *     expect(fooStr).to.be.foo.equal('foo');
     *
     * @param {Object} ctx object to which the method is added
     * @param {String} name of method to add
     * @param {Function} method function to be used for `name`, when called
     * @param {Function} chainingBehavior function to be called every time the property is accessed
     * @namespace Utils
     * @name addChainableMethod
     * @api public
     */

    var addChainableMethod = function addChainableMethod(ctx, name, method, chainingBehavior) {
      if (typeof chainingBehavior !== 'function') {
        chainingBehavior = function () { };
      }

      var chainableBehavior = {
          method: method
        , chainingBehavior: chainingBehavior
      };

      // save the methods so we can overwrite them later, if we need to.
      if (!ctx.__methods) {
        ctx.__methods = {};
      }
      ctx.__methods[name] = chainableBehavior;

      Object.defineProperty(ctx, name,
        { get: function chainableMethodGetter() {
            chainableBehavior.chainingBehavior.call(this);

            var chainableMethodWrapper = function () {
              // Setting the `ssfi` flag to `chainableMethodWrapper` causes this
              // function to be the starting point for removing implementation
              // frames from the stack trace of a failed assertion.
              //
              // However, we only want to use this function as the starting point if
              // the `lockSsfi` flag isn't set.
              //
              // If the `lockSsfi` flag is set, then this assertion is being
              // invoked from inside of another assertion. In this case, the `ssfi`
              // flag has already been set by the outer assertion.
              //
              // Note that overwriting a chainable method merely replaces the saved
              // methods in `ctx.__methods` instead of completely replacing the
              // overwritten assertion. Therefore, an overwriting assertion won't
              // set the `ssfi` or `lockSsfi` flags.
              if (!flag$1(this, 'lockSsfi')) {
                flag$1(this, 'ssfi', chainableMethodWrapper);
              }

              var result = chainableBehavior.method.apply(this, arguments);
              if (result !== undefined) {
                return result;
              }

              var newAssertion = new chai$2.Assertion();
              transferFlags$1(this, newAssertion);
              return newAssertion;
            };

            addLengthGuard(chainableMethodWrapper, name, true);

            // Use `Object.setPrototypeOf` if available
            if (canSetPrototype) {
              // Inherit all properties from the object by replacing the `Function` prototype
              var prototype = Object.create(this);
              // Restore the `call` and `apply` methods from `Function`
              prototype.call = call;
              prototype.apply = apply;
              Object.setPrototypeOf(chainableMethodWrapper, prototype);
            }
            // Otherwise, redefine all properties (slow!)
            else {
              var asserterNames = Object.getOwnPropertyNames(ctx);
              asserterNames.forEach(function (asserterName) {
                if (excludeNames.indexOf(asserterName) !== -1) {
                  return;
                }

                var pd = Object.getOwnPropertyDescriptor(ctx, asserterName);
                Object.defineProperty(chainableMethodWrapper, asserterName, pd);
              });
            }

            transferFlags$1(this, chainableMethodWrapper);
            return proxify(chainableMethodWrapper);
          }
        , configurable: true
      });
    };

    /*!
     * Chai - overwriteChainableMethod utility
     * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
     * MIT Licensed
     */

    var chai$1 = chai$7;
    var transferFlags = transferFlags$6;

    /**
     * ### .overwriteChainableMethod(ctx, name, method, chainingBehavior)
     *
     * Overwrites an already existing chainable method
     * and provides access to the previous function or
     * property.  Must return functions to be used for
     * name.
     *
     *     utils.overwriteChainableMethod(chai.Assertion.prototype, 'lengthOf',
     *       function (_super) {
     *       }
     *     , function (_super) {
     *       }
     *     );
     *
     * Can also be accessed directly from `chai.Assertion`.
     *
     *     chai.Assertion.overwriteChainableMethod('foo', fn, fn);
     *
     * Then can be used as any other assertion.
     *
     *     expect(myFoo).to.have.lengthOf(3);
     *     expect(myFoo).to.have.lengthOf.above(3);
     *
     * @param {Object} ctx object whose method / property is to be overwritten
     * @param {String} name of method / property to overwrite
     * @param {Function} method function that returns a function to be used for name
     * @param {Function} chainingBehavior function that returns a function to be used for property
     * @namespace Utils
     * @name overwriteChainableMethod
     * @api public
     */

    var overwriteChainableMethod = function overwriteChainableMethod(ctx, name, method, chainingBehavior) {
      var chainableBehavior = ctx.__methods[name];

      var _chainingBehavior = chainableBehavior.chainingBehavior;
      chainableBehavior.chainingBehavior = function overwritingChainableMethodGetter() {
        var result = chainingBehavior(_chainingBehavior).call(this);
        if (result !== undefined) {
          return result;
        }

        var newAssertion = new chai$1.Assertion();
        transferFlags(this, newAssertion);
        return newAssertion;
      };

      var _method = chainableBehavior.method;
      chainableBehavior.method = function overwritingChainableMethodWrapper() {
        var result = method(_method).apply(this, arguments);
        if (result !== undefined) {
          return result;
        }

        var newAssertion = new chai$1.Assertion();
        transferFlags(this, newAssertion);
        return newAssertion;
      };
    };

    /*!
     * Chai - compareByInspect utility
     * Copyright(c) 2011-2016 Jake Luer <jake@alogicalparadox.com>
     * MIT Licensed
     */

    /*!
     * Module dependencies
     */

    var inspect = inspect_1;

    /**
     * ### .compareByInspect(mixed, mixed)
     *
     * To be used as a compareFunction with Array.prototype.sort. Compares elements
     * using inspect instead of default behavior of using toString so that Symbols
     * and objects with irregular/missing toString can still be sorted without a
     * TypeError.
     *
     * @param {Mixed} first element to compare
     * @param {Mixed} second element to compare
     * @returns {Number} -1 if 'a' should come before 'b'; otherwise 1
     * @name compareByInspect
     * @namespace Utils
     * @api public
     */

    var compareByInspect = function compareByInspect(a, b) {
      return inspect(a) < inspect(b) ? -1 : 1;
    };

    /*!
     * Chai - getOwnEnumerablePropertySymbols utility
     * Copyright(c) 2011-2016 Jake Luer <jake@alogicalparadox.com>
     * MIT Licensed
     */

    /**
     * ### .getOwnEnumerablePropertySymbols(object)
     *
     * This allows the retrieval of directly-owned enumerable property symbols of an
     * object. This function is necessary because Object.getOwnPropertySymbols
     * returns both enumerable and non-enumerable property symbols.
     *
     * @param {Object} object
     * @returns {Array}
     * @namespace Utils
     * @name getOwnEnumerablePropertySymbols
     * @api public
     */

    var getOwnEnumerablePropertySymbols$1 = function getOwnEnumerablePropertySymbols(obj) {
      if (typeof Object.getOwnPropertySymbols !== 'function') return [];

      return Object.getOwnPropertySymbols(obj).filter(function (sym) {
        return Object.getOwnPropertyDescriptor(obj, sym).enumerable;
      });
    };

    /*!
     * Chai - getOwnEnumerableProperties utility
     * Copyright(c) 2011-2016 Jake Luer <jake@alogicalparadox.com>
     * MIT Licensed
     */

    /*!
     * Module dependencies
     */

    var getOwnEnumerablePropertySymbols = getOwnEnumerablePropertySymbols$1;

    /**
     * ### .getOwnEnumerableProperties(object)
     *
     * This allows the retrieval of directly-owned enumerable property names and
     * symbols of an object. This function is necessary because Object.keys only
     * returns enumerable property names, not enumerable property symbols.
     *
     * @param {Object} object
     * @returns {Array}
     * @namespace Utils
     * @name getOwnEnumerableProperties
     * @api public
     */

    var getOwnEnumerableProperties = function getOwnEnumerableProperties(obj) {
      return Object.keys(obj).concat(getOwnEnumerablePropertySymbols(obj));
    };

    /* !
     * Chai - checkError utility
     * Copyright(c) 2012-2016 Jake Luer <jake@alogicalparadox.com>
     * MIT Licensed
     */

    /**
     * ### .checkError
     *
     * Checks that an error conforms to a given set of criteria and/or retrieves information about it.
     *
     * @api public
     */

    /**
     * ### .compatibleInstance(thrown, errorLike)
     *
     * Checks if two instances are compatible (strict equal).
     * Returns false if errorLike is not an instance of Error, because instances
     * can only be compatible if they're both error instances.
     *
     * @name compatibleInstance
     * @param {Error} thrown error
     * @param {Error|ErrorConstructor} errorLike object to compare against
     * @namespace Utils
     * @api public
     */

    function compatibleInstance(thrown, errorLike) {
      return errorLike instanceof Error && thrown === errorLike;
    }

    /**
     * ### .compatibleConstructor(thrown, errorLike)
     *
     * Checks if two constructors are compatible.
     * This function can receive either an error constructor or
     * an error instance as the `errorLike` argument.
     * Constructors are compatible if they're the same or if one is
     * an instance of another.
     *
     * @name compatibleConstructor
     * @param {Error} thrown error
     * @param {Error|ErrorConstructor} errorLike object to compare against
     * @namespace Utils
     * @api public
     */

    function compatibleConstructor(thrown, errorLike) {
      if (errorLike instanceof Error) {
        // If `errorLike` is an instance of any error we compare their constructors
        return thrown.constructor === errorLike.constructor || thrown instanceof errorLike.constructor;
      } else if (errorLike.prototype instanceof Error || errorLike === Error) {
        // If `errorLike` is a constructor that inherits from Error, we compare `thrown` to `errorLike` directly
        return thrown.constructor === errorLike || thrown instanceof errorLike;
      }

      return false;
    }

    /**
     * ### .compatibleMessage(thrown, errMatcher)
     *
     * Checks if an error's message is compatible with a matcher (String or RegExp).
     * If the message contains the String or passes the RegExp test,
     * it is considered compatible.
     *
     * @name compatibleMessage
     * @param {Error} thrown error
     * @param {String|RegExp} errMatcher to look for into the message
     * @namespace Utils
     * @api public
     */

    function compatibleMessage(thrown, errMatcher) {
      var comparisonString = typeof thrown === 'string' ? thrown : thrown.message;
      if (errMatcher instanceof RegExp) {
        return errMatcher.test(comparisonString);
      } else if (typeof errMatcher === 'string') {
        return comparisonString.indexOf(errMatcher) !== -1; // eslint-disable-line no-magic-numbers
      }

      return false;
    }

    /**
     * ### .getFunctionName(constructorFn)
     *
     * Returns the name of a function.
     * This also includes a polyfill function if `constructorFn.name` is not defined.
     *
     * @name getFunctionName
     * @param {Function} constructorFn
     * @namespace Utils
     * @api private
     */

    var functionNameMatch = /\s*function(?:\s|\s*\/\*[^(?:*\/)]+\*\/\s*)*([^\(\/]+)/;
    function getFunctionName(constructorFn) {
      var name = '';
      if (typeof constructorFn.name === 'undefined') {
        // Here we run a polyfill if constructorFn.name is not defined
        var match = String(constructorFn).match(functionNameMatch);
        if (match) {
          name = match[1];
        }
      } else {
        name = constructorFn.name;
      }

      return name;
    }

    /**
     * ### .getConstructorName(errorLike)
     *
     * Gets the constructor name for an Error instance or constructor itself.
     *
     * @name getConstructorName
     * @param {Error|ErrorConstructor} errorLike
     * @namespace Utils
     * @api public
     */

    function getConstructorName(errorLike) {
      var constructorName = errorLike;
      if (errorLike instanceof Error) {
        constructorName = getFunctionName(errorLike.constructor);
      } else if (typeof errorLike === 'function') {
        // If `err` is not an instance of Error it is an error constructor itself or another function.
        // If we've got a common function we get its name, otherwise we may need to create a new instance
        // of the error just in case it's a poorly-constructed error. Please see chaijs/chai/issues/45 to know more.
        constructorName = getFunctionName(errorLike).trim() ||
            getFunctionName(new errorLike()); // eslint-disable-line new-cap
      }

      return constructorName;
    }

    /**
     * ### .getMessage(errorLike)
     *
     * Gets the error message from an error.
     * If `err` is a String itself, we return it.
     * If the error has no message, we return an empty string.
     *
     * @name getMessage
     * @param {Error|String} errorLike
     * @namespace Utils
     * @api public
     */

    function getMessage(errorLike) {
      var msg = '';
      if (errorLike && errorLike.message) {
        msg = errorLike.message;
      } else if (typeof errorLike === 'string') {
        msg = errorLike;
      }

      return msg;
    }

    var checkError = {
      compatibleInstance: compatibleInstance,
      compatibleConstructor: compatibleConstructor,
      compatibleMessage: compatibleMessage,
      getMessage: getMessage,
      getConstructorName: getConstructorName,
    };

    /*!
     * Chai - isNaN utility
     * Copyright(c) 2012-2015 Sakthipriyan Vairamani <thechargingvolcano@gmail.com>
     * MIT Licensed
     */

    /**
     * ### .isNaN(value)
     *
     * Checks if the given value is NaN or not.
     *
     *     utils.isNaN(NaN); // true
     *
     * @param {Value} The value which has to be checked if it is NaN
     * @name isNaN
     * @api private
     */

    function isNaN$1(value) {
      // Refer http://www.ecma-international.org/ecma-262/6.0/#sec-isnan-number
      // section's NOTE.
      return value !== value;
    }

    // If ECMAScript 6's Number.isNaN is present, prefer that.
    var _isNaN = Number.isNaN || isNaN$1;

    var type = typeDetect.exports;

    var flag = flag$a;

    function isObjectType(obj) {
      var objectType = type(obj);
      var objectTypes = ['Array', 'Object', 'function'];

      return objectTypes.indexOf(objectType) !== -1;
    }

    /**
     * ### .getOperator(message)
     *
     * Extract the operator from error message.
     * Operator defined is based on below link
     * https://nodejs.org/api/assert.html#assert_assert.
     *
     * Returns the `operator` or `undefined` value for an Assertion.
     *
     * @param {Object} object (constructed Assertion)
     * @param {Arguments} chai.Assertion.prototype.assert arguments
     * @namespace Utils
     * @name getOperator
     * @api public
     */

    var getOperator = function getOperator(obj, args) {
      var operator = flag(obj, 'operator');
      var negate = flag(obj, 'negate');
      var expected = args[3];
      var msg = negate ? args[2] : args[1];

      if (operator) {
        return operator;
      }

      if (typeof msg === 'function') msg = msg();

      msg = msg || '';
      if (!msg) {
        return undefined;
      }

      if (/\shave\s/.test(msg)) {
        return undefined;
      }

      var isObject = isObjectType(expected);
      if (/\snot\s/.test(msg)) {
        return isObject ? 'notDeepStrictEqual' : 'notStrictEqual';
      }

      return isObject ? 'deepStrictEqual' : 'strictEqual';
    };

    /*!
     * chai
     * Copyright(c) 2011 Jake Luer <jake@alogicalparadox.com>
     * MIT Licensed
     */

    /*!
     * Dependencies that are used for multiple exports are required here only once
     */

    var pathval = pathval$1;

    /*!
     * test utility
     */

    utils.test = test;

    /*!
     * type utility
     */

    utils.type = typeDetect.exports;

    /*!
     * expectTypes utility
     */
    utils.expectTypes = expectTypes;

    /*!
     * message utility
     */

    utils.getMessage = getMessage$1;

    /*!
     * actual utility
     */

    utils.getActual = getActual$1;

    /*!
     * Inspect util
     */

    utils.inspect = inspect_1;

    /*!
     * Object Display util
     */

    utils.objDisplay = objDisplay$1;

    /*!
     * Flag utility
     */

    utils.flag = flag$a;

    /*!
     * Flag transferring utility
     */

    utils.transferFlags = transferFlags$6;

    /*!
     * Deep equal utility
     */

    utils.eql = deepEql.exports;

    /*!
     * Deep path info
     */

    utils.getPathInfo = pathval.getPathInfo;

    /*!
     * Check if a property exists
     */

    utils.hasProperty = pathval.hasProperty;

    /*!
     * Function name
     */

    utils.getName = getFuncName_1;

    /*!
     * add Property
     */

    utils.addProperty = addProperty;

    /*!
     * add Method
     */

    utils.addMethod = addMethod;

    /*!
     * overwrite Property
     */

    utils.overwriteProperty = overwriteProperty;

    /*!
     * overwrite Method
     */

    utils.overwriteMethod = overwriteMethod;

    /*!
     * Add a chainable method
     */

    utils.addChainableMethod = addChainableMethod;

    /*!
     * Overwrite chainable method
     */

    utils.overwriteChainableMethod = overwriteChainableMethod;

    /*!
     * Compare by inspect method
     */

    utils.compareByInspect = compareByInspect;

    /*!
     * Get own enumerable property symbols method
     */

    utils.getOwnEnumerablePropertySymbols = getOwnEnumerablePropertySymbols$1;

    /*!
     * Get own enumerable properties method
     */

    utils.getOwnEnumerableProperties = getOwnEnumerableProperties;

    /*!
     * Checks error against a given set of criteria
     */

    utils.checkError = checkError;

    /*!
     * Proxify util
     */

    utils.proxify = proxify$3;

    /*!
     * addLengthGuard util
     */

    utils.addLengthGuard = addLengthGuard$3;

    /*!
     * isProxyEnabled helper
     */

    utils.isProxyEnabled = isProxyEnabled$3;

    /*!
     * isNaN method
     */

    utils.isNaN = _isNaN;

    /*!
     * getOperator method
     */

    utils.getOperator = getOperator;

    /*!
     * chai
     * http://chaijs.com
     * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
     * MIT Licensed
     */

    var config = config$5;

    var assertion = function (_chai, util) {
      /*!
       * Module dependencies.
       */

      var AssertionError = _chai.AssertionError
        , flag = util.flag;

      /*!
       * Module export.
       */

      _chai.Assertion = Assertion;

      /*!
       * Assertion Constructor
       *
       * Creates object for chaining.
       *
       * `Assertion` objects contain metadata in the form of flags. Three flags can
       * be assigned during instantiation by passing arguments to this constructor:
       *
       * - `object`: This flag contains the target of the assertion. For example, in
       *   the assertion `expect(numKittens).to.equal(7);`, the `object` flag will
       *   contain `numKittens` so that the `equal` assertion can reference it when
       *   needed.
       *
       * - `message`: This flag contains an optional custom error message to be
       *   prepended to the error message that's generated by the assertion when it
       *   fails.
       *
       * - `ssfi`: This flag stands for "start stack function indicator". It
       *   contains a function reference that serves as the starting point for
       *   removing frames from the stack trace of the error that's created by the
       *   assertion when it fails. The goal is to provide a cleaner stack trace to
       *   end users by removing Chai's internal functions. Note that it only works
       *   in environments that support `Error.captureStackTrace`, and only when
       *   `Chai.config.includeStack` hasn't been set to `false`.
       *
       * - `lockSsfi`: This flag controls whether or not the given `ssfi` flag
       *   should retain its current value, even as assertions are chained off of
       *   this object. This is usually set to `true` when creating a new assertion
       *   from within another assertion. It's also temporarily set to `true` before
       *   an overwritten assertion gets called by the overwriting assertion.
       *
       * @param {Mixed} obj target of the assertion
       * @param {String} msg (optional) custom error message
       * @param {Function} ssfi (optional) starting point for removing stack frames
       * @param {Boolean} lockSsfi (optional) whether or not the ssfi flag is locked
       * @api private
       */

      function Assertion (obj, msg, ssfi, lockSsfi) {
        flag(this, 'ssfi', ssfi || Assertion);
        flag(this, 'lockSsfi', lockSsfi);
        flag(this, 'object', obj);
        flag(this, 'message', msg);

        return util.proxify(this);
      }

      Object.defineProperty(Assertion, 'includeStack', {
        get: function() {
          console.warn('Assertion.includeStack is deprecated, use chai.config.includeStack instead.');
          return config.includeStack;
        },
        set: function(value) {
          console.warn('Assertion.includeStack is deprecated, use chai.config.includeStack instead.');
          config.includeStack = value;
        }
      });

      Object.defineProperty(Assertion, 'showDiff', {
        get: function() {
          console.warn('Assertion.showDiff is deprecated, use chai.config.showDiff instead.');
          return config.showDiff;
        },
        set: function(value) {
          console.warn('Assertion.showDiff is deprecated, use chai.config.showDiff instead.');
          config.showDiff = value;
        }
      });

      Assertion.addProperty = function (name, fn) {
        util.addProperty(this.prototype, name, fn);
      };

      Assertion.addMethod = function (name, fn) {
        util.addMethod(this.prototype, name, fn);
      };

      Assertion.addChainableMethod = function (name, fn, chainingBehavior) {
        util.addChainableMethod(this.prototype, name, fn, chainingBehavior);
      };

      Assertion.overwriteProperty = function (name, fn) {
        util.overwriteProperty(this.prototype, name, fn);
      };

      Assertion.overwriteMethod = function (name, fn) {
        util.overwriteMethod(this.prototype, name, fn);
      };

      Assertion.overwriteChainableMethod = function (name, fn, chainingBehavior) {
        util.overwriteChainableMethod(this.prototype, name, fn, chainingBehavior);
      };

      /**
       * ### .assert(expression, message, negateMessage, expected, actual, showDiff)
       *
       * Executes an expression and check expectations. Throws AssertionError for reporting if test doesn't pass.
       *
       * @name assert
       * @param {Philosophical} expression to be tested
       * @param {String|Function} message or function that returns message to display if expression fails
       * @param {String|Function} negatedMessage or function that returns negatedMessage to display if negated expression fails
       * @param {Mixed} expected value (remember to check for negation)
       * @param {Mixed} actual (optional) will default to `this.obj`
       * @param {Boolean} showDiff (optional) when set to `true`, assert will display a diff in addition to the message if expression fails
       * @api private
       */

      Assertion.prototype.assert = function (expr, msg, negateMsg, expected, _actual, showDiff) {
        var ok = util.test(this, arguments);
        if (false !== showDiff) showDiff = true;
        if (undefined === expected && undefined === _actual) showDiff = false;
        if (true !== config.showDiff) showDiff = false;

        if (!ok) {
          msg = util.getMessage(this, arguments);
          var actual = util.getActual(this, arguments);
          var assertionErrorObjectProperties = {
              actual: actual
            , expected: expected
            , showDiff: showDiff
          };

          var operator = util.getOperator(this, arguments);
          if (operator) {
            assertionErrorObjectProperties.operator = operator;
          }

          throw new AssertionError(
            msg,
            assertionErrorObjectProperties,
            (config.includeStack) ? this.assert : flag(this, 'ssfi'));
        }
      };

      /*!
       * ### ._obj
       *
       * Quick reference to stored `actual` value for plugin developers.
       *
       * @api private
       */

      Object.defineProperty(Assertion.prototype, '_obj',
        { get: function () {
            return flag(this, 'object');
          }
        , set: function (val) {
            flag(this, 'object', val);
          }
      });
    };

    /*!
     * chai
     * http://chaijs.com
     * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
     * MIT Licensed
     */

    var assertions = function (chai, _) {
      var Assertion = chai.Assertion
        , AssertionError = chai.AssertionError
        , flag = _.flag;

      /**
       * ### Language Chains
       *
       * The following are provided as chainable getters to improve the readability
       * of your assertions.
       *
       * **Chains**
       *
       * - to
       * - be
       * - been
       * - is
       * - that
       * - which
       * - and
       * - has
       * - have
       * - with
       * - at
       * - of
       * - same
       * - but
       * - does
       * - still
       * - also
       *
       * @name language chains
       * @namespace BDD
       * @api public
       */

      [ 'to', 'be', 'been', 'is'
      , 'and', 'has', 'have', 'with'
      , 'that', 'which', 'at', 'of'
      , 'same', 'but', 'does', 'still', "also" ].forEach(function (chain) {
        Assertion.addProperty(chain);
      });

      /**
       * ### .not
       *
       * Negates all assertions that follow in the chain.
       *
       *     expect(function () {}).to.not.throw();
       *     expect({a: 1}).to.not.have.property('b');
       *     expect([1, 2]).to.be.an('array').that.does.not.include(3);
       *
       * Just because you can negate any assertion with `.not` doesn't mean you
       * should. With great power comes great responsibility. It's often best to
       * assert that the one expected output was produced, rather than asserting
       * that one of countless unexpected outputs wasn't produced. See individual
       * assertions for specific guidance.
       *
       *     expect(2).to.equal(2); // Recommended
       *     expect(2).to.not.equal(1); // Not recommended
       *
       * @name not
       * @namespace BDD
       * @api public
       */

      Assertion.addProperty('not', function () {
        flag(this, 'negate', true);
      });

      /**
       * ### .deep
       *
       * Causes all `.equal`, `.include`, `.members`, `.keys`, and `.property`
       * assertions that follow in the chain to use deep equality instead of strict
       * (`===`) equality. See the `deep-eql` project page for info on the deep
       * equality algorithm: https://github.com/chaijs/deep-eql.
       *
       *     // Target object deeply (but not strictly) equals `{a: 1}`
       *     expect({a: 1}).to.deep.equal({a: 1});
       *     expect({a: 1}).to.not.equal({a: 1});
       *
       *     // Target array deeply (but not strictly) includes `{a: 1}`
       *     expect([{a: 1}]).to.deep.include({a: 1});
       *     expect([{a: 1}]).to.not.include({a: 1});
       *
       *     // Target object deeply (but not strictly) includes `x: {a: 1}`
       *     expect({x: {a: 1}}).to.deep.include({x: {a: 1}});
       *     expect({x: {a: 1}}).to.not.include({x: {a: 1}});
       *
       *     // Target array deeply (but not strictly) has member `{a: 1}`
       *     expect([{a: 1}]).to.have.deep.members([{a: 1}]);
       *     expect([{a: 1}]).to.not.have.members([{a: 1}]);
       *
       *     // Target set deeply (but not strictly) has key `{a: 1}`
       *     expect(new Set([{a: 1}])).to.have.deep.keys([{a: 1}]);
       *     expect(new Set([{a: 1}])).to.not.have.keys([{a: 1}]);
       *
       *     // Target object deeply (but not strictly) has property `x: {a: 1}`
       *     expect({x: {a: 1}}).to.have.deep.property('x', {a: 1});
       *     expect({x: {a: 1}}).to.not.have.property('x', {a: 1});
       *
       * @name deep
       * @namespace BDD
       * @api public
       */

      Assertion.addProperty('deep', function () {
        flag(this, 'deep', true);
      });

      /**
       * ### .nested
       *
       * Enables dot- and bracket-notation in all `.property` and `.include`
       * assertions that follow in the chain.
       *
       *     expect({a: {b: ['x', 'y']}}).to.have.nested.property('a.b[1]');
       *     expect({a: {b: ['x', 'y']}}).to.nested.include({'a.b[1]': 'y'});
       *
       * If `.` or `[]` are part of an actual property name, they can be escaped by
       * adding two backslashes before them.
       *
       *     expect({'.a': {'[b]': 'x'}}).to.have.nested.property('\\.a.\\[b\\]');
       *     expect({'.a': {'[b]': 'x'}}).to.nested.include({'\\.a.\\[b\\]': 'x'});
       *
       * `.nested` cannot be combined with `.own`.
       *
       * @name nested
       * @namespace BDD
       * @api public
       */

      Assertion.addProperty('nested', function () {
        flag(this, 'nested', true);
      });

      /**
       * ### .own
       *
       * Causes all `.property` and `.include` assertions that follow in the chain
       * to ignore inherited properties.
       *
       *     Object.prototype.b = 2;
       *
       *     expect({a: 1}).to.have.own.property('a');
       *     expect({a: 1}).to.have.property('b');
       *     expect({a: 1}).to.not.have.own.property('b');
       *
       *     expect({a: 1}).to.own.include({a: 1});
       *     expect({a: 1}).to.include({b: 2}).but.not.own.include({b: 2});
       *
       * `.own` cannot be combined with `.nested`.
       *
       * @name own
       * @namespace BDD
       * @api public
       */

      Assertion.addProperty('own', function () {
        flag(this, 'own', true);
      });

      /**
       * ### .ordered
       *
       * Causes all `.members` assertions that follow in the chain to require that
       * members be in the same order.
       *
       *     expect([1, 2]).to.have.ordered.members([1, 2])
       *       .but.not.have.ordered.members([2, 1]);
       *
       * When `.include` and `.ordered` are combined, the ordering begins at the
       * start of both arrays.
       *
       *     expect([1, 2, 3]).to.include.ordered.members([1, 2])
       *       .but.not.include.ordered.members([2, 3]);
       *
       * @name ordered
       * @namespace BDD
       * @api public
       */

      Assertion.addProperty('ordered', function () {
        flag(this, 'ordered', true);
      });

      /**
       * ### .any
       *
       * Causes all `.keys` assertions that follow in the chain to only require that
       * the target have at least one of the given keys. This is the opposite of
       * `.all`, which requires that the target have all of the given keys.
       *
       *     expect({a: 1, b: 2}).to.not.have.any.keys('c', 'd');
       *
       * See the `.keys` doc for guidance on when to use `.any` or `.all`.
       *
       * @name any
       * @namespace BDD
       * @api public
       */

      Assertion.addProperty('any', function () {
        flag(this, 'any', true);
        flag(this, 'all', false);
      });

      /**
       * ### .all
       *
       * Causes all `.keys` assertions that follow in the chain to require that the
       * target have all of the given keys. This is the opposite of `.any`, which
       * only requires that the target have at least one of the given keys.
       *
       *     expect({a: 1, b: 2}).to.have.all.keys('a', 'b');
       *
       * Note that `.all` is used by default when neither `.all` nor `.any` are
       * added earlier in the chain. However, it's often best to add `.all` anyway
       * because it improves readability.
       *
       * See the `.keys` doc for guidance on when to use `.any` or `.all`.
       *
       * @name all
       * @namespace BDD
       * @api public
       */

      Assertion.addProperty('all', function () {
        flag(this, 'all', true);
        flag(this, 'any', false);
      });

      /**
       * ### .a(type[, msg])
       *
       * Asserts that the target's type is equal to the given string `type`. Types
       * are case insensitive. See the `type-detect` project page for info on the
       * type detection algorithm: https://github.com/chaijs/type-detect.
       *
       *     expect('foo').to.be.a('string');
       *     expect({a: 1}).to.be.an('object');
       *     expect(null).to.be.a('null');
       *     expect(undefined).to.be.an('undefined');
       *     expect(new Error).to.be.an('error');
       *     expect(Promise.resolve()).to.be.a('promise');
       *     expect(new Float32Array).to.be.a('float32array');
       *     expect(Symbol()).to.be.a('symbol');
       *
       * `.a` supports objects that have a custom type set via `Symbol.toStringTag`.
       *
       *     var myObj = {
       *       [Symbol.toStringTag]: 'myCustomType'
       *     };
       *
       *     expect(myObj).to.be.a('myCustomType').but.not.an('object');
       *
       * It's often best to use `.a` to check a target's type before making more
       * assertions on the same target. That way, you avoid unexpected behavior from
       * any assertion that does different things based on the target's type.
       *
       *     expect([1, 2, 3]).to.be.an('array').that.includes(2);
       *     expect([]).to.be.an('array').that.is.empty;
       *
       * Add `.not` earlier in the chain to negate `.a`. However, it's often best to
       * assert that the target is the expected type, rather than asserting that it
       * isn't one of many unexpected types.
       *
       *     expect('foo').to.be.a('string'); // Recommended
       *     expect('foo').to.not.be.an('array'); // Not recommended
       *
       * `.a` accepts an optional `msg` argument which is a custom error message to
       * show when the assertion fails. The message can also be given as the second
       * argument to `expect`.
       *
       *     expect(1).to.be.a('string', 'nooo why fail??');
       *     expect(1, 'nooo why fail??').to.be.a('string');
       *
       * `.a` can also be used as a language chain to improve the readability of
       * your assertions.
       *
       *     expect({b: 2}).to.have.a.property('b');
       *
       * The alias `.an` can be used interchangeably with `.a`.
       *
       * @name a
       * @alias an
       * @param {String} type
       * @param {String} msg _optional_
       * @namespace BDD
       * @api public
       */

      function an (type, msg) {
        if (msg) flag(this, 'message', msg);
        type = type.toLowerCase();
        var obj = flag(this, 'object')
          , article = ~[ 'a', 'e', 'i', 'o', 'u' ].indexOf(type.charAt(0)) ? 'an ' : 'a ';

        this.assert(
            type === _.type(obj).toLowerCase()
          , 'expected #{this} to be ' + article + type
          , 'expected #{this} not to be ' + article + type
        );
      }

      Assertion.addChainableMethod('an', an);
      Assertion.addChainableMethod('a', an);

      /**
       * ### .include(val[, msg])
       *
       * When the target is a string, `.include` asserts that the given string `val`
       * is a substring of the target.
       *
       *     expect('foobar').to.include('foo');
       *
       * When the target is an array, `.include` asserts that the given `val` is a
       * member of the target.
       *
       *     expect([1, 2, 3]).to.include(2);
       *
       * When the target is an object, `.include` asserts that the given object
       * `val`'s properties are a subset of the target's properties.
       *
       *     expect({a: 1, b: 2, c: 3}).to.include({a: 1, b: 2});
       *
       * When the target is a Set or WeakSet, `.include` asserts that the given `val` is a
       * member of the target. SameValueZero equality algorithm is used.
       *
       *     expect(new Set([1, 2])).to.include(2);
       *
       * When the target is a Map, `.include` asserts that the given `val` is one of
       * the values of the target. SameValueZero equality algorithm is used.
       *
       *     expect(new Map([['a', 1], ['b', 2]])).to.include(2);
       *
       * Because `.include` does different things based on the target's type, it's
       * important to check the target's type before using `.include`. See the `.a`
       * doc for info on testing a target's type.
       *
       *     expect([1, 2, 3]).to.be.an('array').that.includes(2);
       *
       * By default, strict (`===`) equality is used to compare array members and
       * object properties. Add `.deep` earlier in the chain to use deep equality
       * instead (WeakSet targets are not supported). See the `deep-eql` project
       * page for info on the deep equality algorithm: https://github.com/chaijs/deep-eql.
       *
       *     // Target array deeply (but not strictly) includes `{a: 1}`
       *     expect([{a: 1}]).to.deep.include({a: 1});
       *     expect([{a: 1}]).to.not.include({a: 1});
       *
       *     // Target object deeply (but not strictly) includes `x: {a: 1}`
       *     expect({x: {a: 1}}).to.deep.include({x: {a: 1}});
       *     expect({x: {a: 1}}).to.not.include({x: {a: 1}});
       *
       * By default, all of the target's properties are searched when working with
       * objects. This includes properties that are inherited and/or non-enumerable.
       * Add `.own` earlier in the chain to exclude the target's inherited
       * properties from the search.
       *
       *     Object.prototype.b = 2;
       *
       *     expect({a: 1}).to.own.include({a: 1});
       *     expect({a: 1}).to.include({b: 2}).but.not.own.include({b: 2});
       *
       * Note that a target object is always only searched for `val`'s own
       * enumerable properties.
       *
       * `.deep` and `.own` can be combined.
       *
       *     expect({a: {b: 2}}).to.deep.own.include({a: {b: 2}});
       *
       * Add `.nested` earlier in the chain to enable dot- and bracket-notation when
       * referencing nested properties.
       *
       *     expect({a: {b: ['x', 'y']}}).to.nested.include({'a.b[1]': 'y'});
       *
       * If `.` or `[]` are part of an actual property name, they can be escaped by
       * adding two backslashes before them.
       *
       *     expect({'.a': {'[b]': 2}}).to.nested.include({'\\.a.\\[b\\]': 2});
       *
       * `.deep` and `.nested` can be combined.
       *
       *     expect({a: {b: [{c: 3}]}}).to.deep.nested.include({'a.b[0]': {c: 3}});
       *
       * `.own` and `.nested` cannot be combined.
       *
       * Add `.not` earlier in the chain to negate `.include`.
       *
       *     expect('foobar').to.not.include('taco');
       *     expect([1, 2, 3]).to.not.include(4);
       *
       * However, it's dangerous to negate `.include` when the target is an object.
       * The problem is that it creates uncertain expectations by asserting that the
       * target object doesn't have all of `val`'s key/value pairs but may or may
       * not have some of them. It's often best to identify the exact output that's
       * expected, and then write an assertion that only accepts that exact output.
       *
       * When the target object isn't even expected to have `val`'s keys, it's
       * often best to assert exactly that.
       *
       *     expect({c: 3}).to.not.have.any.keys('a', 'b'); // Recommended
       *     expect({c: 3}).to.not.include({a: 1, b: 2}); // Not recommended
       *
       * When the target object is expected to have `val`'s keys, it's often best to
       * assert that each of the properties has its expected value, rather than
       * asserting that each property doesn't have one of many unexpected values.
       *
       *     expect({a: 3, b: 4}).to.include({a: 3, b: 4}); // Recommended
       *     expect({a: 3, b: 4}).to.not.include({a: 1, b: 2}); // Not recommended
       *
       * `.include` accepts an optional `msg` argument which is a custom error
       * message to show when the assertion fails. The message can also be given as
       * the second argument to `expect`.
       *
       *     expect([1, 2, 3]).to.include(4, 'nooo why fail??');
       *     expect([1, 2, 3], 'nooo why fail??').to.include(4);
       *
       * `.include` can also be used as a language chain, causing all `.members` and
       * `.keys` assertions that follow in the chain to require the target to be a
       * superset of the expected set, rather than an identical set. Note that
       * `.members` ignores duplicates in the subset when `.include` is added.
       *
       *     // Target object's keys are a superset of ['a', 'b'] but not identical
       *     expect({a: 1, b: 2, c: 3}).to.include.all.keys('a', 'b');
       *     expect({a: 1, b: 2, c: 3}).to.not.have.all.keys('a', 'b');
       *
       *     // Target array is a superset of [1, 2] but not identical
       *     expect([1, 2, 3]).to.include.members([1, 2]);
       *     expect([1, 2, 3]).to.not.have.members([1, 2]);
       *
       *     // Duplicates in the subset are ignored
       *     expect([1, 2, 3]).to.include.members([1, 2, 2, 2]);
       *
       * Note that adding `.any` earlier in the chain causes the `.keys` assertion
       * to ignore `.include`.
       *
       *     // Both assertions are identical
       *     expect({a: 1}).to.include.any.keys('a', 'b');
       *     expect({a: 1}).to.have.any.keys('a', 'b');
       *
       * The aliases `.includes`, `.contain`, and `.contains` can be used
       * interchangeably with `.include`.
       *
       * @name include
       * @alias contain
       * @alias includes
       * @alias contains
       * @param {Mixed} val
       * @param {String} msg _optional_
       * @namespace BDD
       * @api public
       */

      function SameValueZero(a, b) {
        return (_.isNaN(a) && _.isNaN(b)) || a === b;
      }

      function includeChainingBehavior () {
        flag(this, 'contains', true);
      }

      function include (val, msg) {
        if (msg) flag(this, 'message', msg);

        var obj = flag(this, 'object')
          , objType = _.type(obj).toLowerCase()
          , flagMsg = flag(this, 'message')
          , negate = flag(this, 'negate')
          , ssfi = flag(this, 'ssfi')
          , isDeep = flag(this, 'deep')
          , descriptor = isDeep ? 'deep ' : '';

        flagMsg = flagMsg ? flagMsg + ': ' : '';

        var included = false;

        switch (objType) {
          case 'string':
            included = obj.indexOf(val) !== -1;
            break;

          case 'weakset':
            if (isDeep) {
              throw new AssertionError(
                flagMsg + 'unable to use .deep.include with WeakSet',
                undefined,
                ssfi
              );
            }

            included = obj.has(val);
            break;

          case 'map':
            var isEql = isDeep ? _.eql : SameValueZero;
            obj.forEach(function (item) {
              included = included || isEql(item, val);
            });
            break;

          case 'set':
            if (isDeep) {
              obj.forEach(function (item) {
                included = included || _.eql(item, val);
              });
            } else {
              included = obj.has(val);
            }
            break;

          case 'array':
            if (isDeep) {
              included = obj.some(function (item) {
                return _.eql(item, val);
              });
            } else {
              included = obj.indexOf(val) !== -1;
            }
            break;

          default:
            // This block is for asserting a subset of properties in an object.
            // `_.expectTypes` isn't used here because `.include` should work with
            // objects with a custom `@@toStringTag`.
            if (val !== Object(val)) {
              throw new AssertionError(
                flagMsg + 'the given combination of arguments ('
                + objType + ' and '
                + _.type(val).toLowerCase() + ')'
                + ' is invalid for this assertion. '
                + 'You can use an array, a map, an object, a set, a string, '
                + 'or a weakset instead of a '
                + _.type(val).toLowerCase(),
                undefined,
                ssfi
              );
            }

            var props = Object.keys(val)
              , firstErr = null
              , numErrs = 0;

            props.forEach(function (prop) {
              var propAssertion = new Assertion(obj);
              _.transferFlags(this, propAssertion, true);
              flag(propAssertion, 'lockSsfi', true);

              if (!negate || props.length === 1) {
                propAssertion.property(prop, val[prop]);
                return;
              }

              try {
                propAssertion.property(prop, val[prop]);
              } catch (err) {
                if (!_.checkError.compatibleConstructor(err, AssertionError)) {
                  throw err;
                }
                if (firstErr === null) firstErr = err;
                numErrs++;
              }
            }, this);

            // When validating .not.include with multiple properties, we only want
            // to throw an assertion error if all of the properties are included,
            // in which case we throw the first property assertion error that we
            // encountered.
            if (negate && props.length > 1 && numErrs === props.length) {
              throw firstErr;
            }
            return;
        }

        // Assert inclusion in collection or substring in a string.
        this.assert(
          included
          , 'expected #{this} to ' + descriptor + 'include ' + _.inspect(val)
          , 'expected #{this} to not ' + descriptor + 'include ' + _.inspect(val));
      }

      Assertion.addChainableMethod('include', include, includeChainingBehavior);
      Assertion.addChainableMethod('contain', include, includeChainingBehavior);
      Assertion.addChainableMethod('contains', include, includeChainingBehavior);
      Assertion.addChainableMethod('includes', include, includeChainingBehavior);

      /**
       * ### .ok
       *
       * Asserts that the target is a truthy value (considered `true` in boolean context).
       * However, it's often best to assert that the target is strictly (`===`) or
       * deeply equal to its expected value.
       *
       *     expect(1).to.equal(1); // Recommended
       *     expect(1).to.be.ok; // Not recommended
       *
       *     expect(true).to.be.true; // Recommended
       *     expect(true).to.be.ok; // Not recommended
       *
       * Add `.not` earlier in the chain to negate `.ok`.
       *
       *     expect(0).to.equal(0); // Recommended
       *     expect(0).to.not.be.ok; // Not recommended
       *
       *     expect(false).to.be.false; // Recommended
       *     expect(false).to.not.be.ok; // Not recommended
       *
       *     expect(null).to.be.null; // Recommended
       *     expect(null).to.not.be.ok; // Not recommended
       *
       *     expect(undefined).to.be.undefined; // Recommended
       *     expect(undefined).to.not.be.ok; // Not recommended
       *
       * A custom error message can be given as the second argument to `expect`.
       *
       *     expect(false, 'nooo why fail??').to.be.ok;
       *
       * @name ok
       * @namespace BDD
       * @api public
       */

      Assertion.addProperty('ok', function () {
        this.assert(
            flag(this, 'object')
          , 'expected #{this} to be truthy'
          , 'expected #{this} to be falsy');
      });

      /**
       * ### .true
       *
       * Asserts that the target is strictly (`===`) equal to `true`.
       *
       *     expect(true).to.be.true;
       *
       * Add `.not` earlier in the chain to negate `.true`. However, it's often best
       * to assert that the target is equal to its expected value, rather than not
       * equal to `true`.
       *
       *     expect(false).to.be.false; // Recommended
       *     expect(false).to.not.be.true; // Not recommended
       *
       *     expect(1).to.equal(1); // Recommended
       *     expect(1).to.not.be.true; // Not recommended
       *
       * A custom error message can be given as the second argument to `expect`.
       *
       *     expect(false, 'nooo why fail??').to.be.true;
       *
       * @name true
       * @namespace BDD
       * @api public
       */

      Assertion.addProperty('true', function () {
        this.assert(
            true === flag(this, 'object')
          , 'expected #{this} to be true'
          , 'expected #{this} to be false'
          , flag(this, 'negate') ? false : true
        );
      });

      /**
       * ### .false
       *
       * Asserts that the target is strictly (`===`) equal to `false`.
       *
       *     expect(false).to.be.false;
       *
       * Add `.not` earlier in the chain to negate `.false`. However, it's often
       * best to assert that the target is equal to its expected value, rather than
       * not equal to `false`.
       *
       *     expect(true).to.be.true; // Recommended
       *     expect(true).to.not.be.false; // Not recommended
       *
       *     expect(1).to.equal(1); // Recommended
       *     expect(1).to.not.be.false; // Not recommended
       *
       * A custom error message can be given as the second argument to `expect`.
       *
       *     expect(true, 'nooo why fail??').to.be.false;
       *
       * @name false
       * @namespace BDD
       * @api public
       */

      Assertion.addProperty('false', function () {
        this.assert(
            false === flag(this, 'object')
          , 'expected #{this} to be false'
          , 'expected #{this} to be true'
          , flag(this, 'negate') ? true : false
        );
      });

      /**
       * ### .null
       *
       * Asserts that the target is strictly (`===`) equal to `null`.
       *
       *     expect(null).to.be.null;
       *
       * Add `.not` earlier in the chain to negate `.null`. However, it's often best
       * to assert that the target is equal to its expected value, rather than not
       * equal to `null`.
       *
       *     expect(1).to.equal(1); // Recommended
       *     expect(1).to.not.be.null; // Not recommended
       *
       * A custom error message can be given as the second argument to `expect`.
       *
       *     expect(42, 'nooo why fail??').to.be.null;
       *
       * @name null
       * @namespace BDD
       * @api public
       */

      Assertion.addProperty('null', function () {
        this.assert(
            null === flag(this, 'object')
          , 'expected #{this} to be null'
          , 'expected #{this} not to be null'
        );
      });

      /**
       * ### .undefined
       *
       * Asserts that the target is strictly (`===`) equal to `undefined`.
       *
       *     expect(undefined).to.be.undefined;
       *
       * Add `.not` earlier in the chain to negate `.undefined`. However, it's often
       * best to assert that the target is equal to its expected value, rather than
       * not equal to `undefined`.
       *
       *     expect(1).to.equal(1); // Recommended
       *     expect(1).to.not.be.undefined; // Not recommended
       *
       * A custom error message can be given as the second argument to `expect`.
       *
       *     expect(42, 'nooo why fail??').to.be.undefined;
       *
       * @name undefined
       * @namespace BDD
       * @api public
       */

      Assertion.addProperty('undefined', function () {
        this.assert(
            undefined === flag(this, 'object')
          , 'expected #{this} to be undefined'
          , 'expected #{this} not to be undefined'
        );
      });

      /**
       * ### .NaN
       *
       * Asserts that the target is exactly `NaN`.
       *
       *     expect(NaN).to.be.NaN;
       *
       * Add `.not` earlier in the chain to negate `.NaN`. However, it's often best
       * to assert that the target is equal to its expected value, rather than not
       * equal to `NaN`.
       *
       *     expect('foo').to.equal('foo'); // Recommended
       *     expect('foo').to.not.be.NaN; // Not recommended
       *
       * A custom error message can be given as the second argument to `expect`.
       *
       *     expect(42, 'nooo why fail??').to.be.NaN;
       *
       * @name NaN
       * @namespace BDD
       * @api public
       */

      Assertion.addProperty('NaN', function () {
        this.assert(
            _.isNaN(flag(this, 'object'))
            , 'expected #{this} to be NaN'
            , 'expected #{this} not to be NaN'
        );
      });

      /**
       * ### .exist
       *
       * Asserts that the target is not strictly (`===`) equal to either `null` or
       * `undefined`. However, it's often best to assert that the target is equal to
       * its expected value.
       *
       *     expect(1).to.equal(1); // Recommended
       *     expect(1).to.exist; // Not recommended
       *
       *     expect(0).to.equal(0); // Recommended
       *     expect(0).to.exist; // Not recommended
       *
       * Add `.not` earlier in the chain to negate `.exist`.
       *
       *     expect(null).to.be.null; // Recommended
       *     expect(null).to.not.exist; // Not recommended
       *
       *     expect(undefined).to.be.undefined; // Recommended
       *     expect(undefined).to.not.exist; // Not recommended
       *
       * A custom error message can be given as the second argument to `expect`.
       *
       *     expect(null, 'nooo why fail??').to.exist;
       *
       * The alias `.exists` can be used interchangeably with `.exist`.
       *
       * @name exist
       * @alias exists
       * @namespace BDD
       * @api public
       */

      function assertExist () {
        var val = flag(this, 'object');
        this.assert(
            val !== null && val !== undefined
          , 'expected #{this} to exist'
          , 'expected #{this} to not exist'
        );
      }

      Assertion.addProperty('exist', assertExist);
      Assertion.addProperty('exists', assertExist);

      /**
       * ### .empty
       *
       * When the target is a string or array, `.empty` asserts that the target's
       * `length` property is strictly (`===`) equal to `0`.
       *
       *     expect([]).to.be.empty;
       *     expect('').to.be.empty;
       *
       * When the target is a map or set, `.empty` asserts that the target's `size`
       * property is strictly equal to `0`.
       *
       *     expect(new Set()).to.be.empty;
       *     expect(new Map()).to.be.empty;
       *
       * When the target is a non-function object, `.empty` asserts that the target
       * doesn't have any own enumerable properties. Properties with Symbol-based
       * keys are excluded from the count.
       *
       *     expect({}).to.be.empty;
       *
       * Because `.empty` does different things based on the target's type, it's
       * important to check the target's type before using `.empty`. See the `.a`
       * doc for info on testing a target's type.
       *
       *     expect([]).to.be.an('array').that.is.empty;
       *
       * Add `.not` earlier in the chain to negate `.empty`. However, it's often
       * best to assert that the target contains its expected number of values,
       * rather than asserting that it's not empty.
       *
       *     expect([1, 2, 3]).to.have.lengthOf(3); // Recommended
       *     expect([1, 2, 3]).to.not.be.empty; // Not recommended
       *
       *     expect(new Set([1, 2, 3])).to.have.property('size', 3); // Recommended
       *     expect(new Set([1, 2, 3])).to.not.be.empty; // Not recommended
       *
       *     expect(Object.keys({a: 1})).to.have.lengthOf(1); // Recommended
       *     expect({a: 1}).to.not.be.empty; // Not recommended
       *
       * A custom error message can be given as the second argument to `expect`.
       *
       *     expect([1, 2, 3], 'nooo why fail??').to.be.empty;
       *
       * @name empty
       * @namespace BDD
       * @api public
       */

      Assertion.addProperty('empty', function () {
        var val = flag(this, 'object')
          , ssfi = flag(this, 'ssfi')
          , flagMsg = flag(this, 'message')
          , itemsCount;

        flagMsg = flagMsg ? flagMsg + ': ' : '';

        switch (_.type(val).toLowerCase()) {
          case 'array':
          case 'string':
            itemsCount = val.length;
            break;
          case 'map':
          case 'set':
            itemsCount = val.size;
            break;
          case 'weakmap':
          case 'weakset':
            throw new AssertionError(
              flagMsg + '.empty was passed a weak collection',
              undefined,
              ssfi
            );
          case 'function':
            var msg = flagMsg + '.empty was passed a function ' + _.getName(val);
            throw new AssertionError(msg.trim(), undefined, ssfi);
          default:
            if (val !== Object(val)) {
              throw new AssertionError(
                flagMsg + '.empty was passed non-string primitive ' + _.inspect(val),
                undefined,
                ssfi
              );
            }
            itemsCount = Object.keys(val).length;
        }

        this.assert(
            0 === itemsCount
          , 'expected #{this} to be empty'
          , 'expected #{this} not to be empty'
        );
      });

      /**
       * ### .arguments
       *
       * Asserts that the target is an `arguments` object.
       *
       *     function test () {
       *       expect(arguments).to.be.arguments;
       *     }
       *
       *     test();
       *
       * Add `.not` earlier in the chain to negate `.arguments`. However, it's often
       * best to assert which type the target is expected to be, rather than
       * asserting that it’s not an `arguments` object.
       *
       *     expect('foo').to.be.a('string'); // Recommended
       *     expect('foo').to.not.be.arguments; // Not recommended
       *
       * A custom error message can be given as the second argument to `expect`.
       *
       *     expect({}, 'nooo why fail??').to.be.arguments;
       *
       * The alias `.Arguments` can be used interchangeably with `.arguments`.
       *
       * @name arguments
       * @alias Arguments
       * @namespace BDD
       * @api public
       */

      function checkArguments () {
        var obj = flag(this, 'object')
          , type = _.type(obj);
        this.assert(
            'Arguments' === type
          , 'expected #{this} to be arguments but got ' + type
          , 'expected #{this} to not be arguments'
        );
      }

      Assertion.addProperty('arguments', checkArguments);
      Assertion.addProperty('Arguments', checkArguments);

      /**
       * ### .equal(val[, msg])
       *
       * Asserts that the target is strictly (`===`) equal to the given `val`.
       *
       *     expect(1).to.equal(1);
       *     expect('foo').to.equal('foo');
       *
       * Add `.deep` earlier in the chain to use deep equality instead. See the
       * `deep-eql` project page for info on the deep equality algorithm:
       * https://github.com/chaijs/deep-eql.
       *
       *     // Target object deeply (but not strictly) equals `{a: 1}`
       *     expect({a: 1}).to.deep.equal({a: 1});
       *     expect({a: 1}).to.not.equal({a: 1});
       *
       *     // Target array deeply (but not strictly) equals `[1, 2]`
       *     expect([1, 2]).to.deep.equal([1, 2]);
       *     expect([1, 2]).to.not.equal([1, 2]);
       *
       * Add `.not` earlier in the chain to negate `.equal`. However, it's often
       * best to assert that the target is equal to its expected value, rather than
       * not equal to one of countless unexpected values.
       *
       *     expect(1).to.equal(1); // Recommended
       *     expect(1).to.not.equal(2); // Not recommended
       *
       * `.equal` accepts an optional `msg` argument which is a custom error message
       * to show when the assertion fails. The message can also be given as the
       * second argument to `expect`.
       *
       *     expect(1).to.equal(2, 'nooo why fail??');
       *     expect(1, 'nooo why fail??').to.equal(2);
       *
       * The aliases `.equals` and `eq` can be used interchangeably with `.equal`.
       *
       * @name equal
       * @alias equals
       * @alias eq
       * @param {Mixed} val
       * @param {String} msg _optional_
       * @namespace BDD
       * @api public
       */

      function assertEqual (val, msg) {
        if (msg) flag(this, 'message', msg);
        var obj = flag(this, 'object');
        if (flag(this, 'deep')) {
          var prevLockSsfi = flag(this, 'lockSsfi');
          flag(this, 'lockSsfi', true);
          this.eql(val);
          flag(this, 'lockSsfi', prevLockSsfi);
        } else {
          this.assert(
              val === obj
            , 'expected #{this} to equal #{exp}'
            , 'expected #{this} to not equal #{exp}'
            , val
            , this._obj
            , true
          );
        }
      }

      Assertion.addMethod('equal', assertEqual);
      Assertion.addMethod('equals', assertEqual);
      Assertion.addMethod('eq', assertEqual);

      /**
       * ### .eql(obj[, msg])
       *
       * Asserts that the target is deeply equal to the given `obj`. See the
       * `deep-eql` project page for info on the deep equality algorithm:
       * https://github.com/chaijs/deep-eql.
       *
       *     // Target object is deeply (but not strictly) equal to {a: 1}
       *     expect({a: 1}).to.eql({a: 1}).but.not.equal({a: 1});
       *
       *     // Target array is deeply (but not strictly) equal to [1, 2]
       *     expect([1, 2]).to.eql([1, 2]).but.not.equal([1, 2]);
       *
       * Add `.not` earlier in the chain to negate `.eql`. However, it's often best
       * to assert that the target is deeply equal to its expected value, rather
       * than not deeply equal to one of countless unexpected values.
       *
       *     expect({a: 1}).to.eql({a: 1}); // Recommended
       *     expect({a: 1}).to.not.eql({b: 2}); // Not recommended
       *
       * `.eql` accepts an optional `msg` argument which is a custom error message
       * to show when the assertion fails. The message can also be given as the
       * second argument to `expect`.
       *
       *     expect({a: 1}).to.eql({b: 2}, 'nooo why fail??');
       *     expect({a: 1}, 'nooo why fail??').to.eql({b: 2});
       *
       * The alias `.eqls` can be used interchangeably with `.eql`.
       *
       * The `.deep.equal` assertion is almost identical to `.eql` but with one
       * difference: `.deep.equal` causes deep equality comparisons to also be used
       * for any other assertions that follow in the chain.
       *
       * @name eql
       * @alias eqls
       * @param {Mixed} obj
       * @param {String} msg _optional_
       * @namespace BDD
       * @api public
       */

      function assertEql(obj, msg) {
        if (msg) flag(this, 'message', msg);
        this.assert(
            _.eql(obj, flag(this, 'object'))
          , 'expected #{this} to deeply equal #{exp}'
          , 'expected #{this} to not deeply equal #{exp}'
          , obj
          , this._obj
          , true
        );
      }

      Assertion.addMethod('eql', assertEql);
      Assertion.addMethod('eqls', assertEql);

      /**
       * ### .above(n[, msg])
       *
       * Asserts that the target is a number or a date greater than the given number or date `n` respectively.
       * However, it's often best to assert that the target is equal to its expected
       * value.
       *
       *     expect(2).to.equal(2); // Recommended
       *     expect(2).to.be.above(1); // Not recommended
       *
       * Add `.lengthOf` earlier in the chain to assert that the target's `length`
       * or `size` is greater than the given number `n`.
       *
       *     expect('foo').to.have.lengthOf(3); // Recommended
       *     expect('foo').to.have.lengthOf.above(2); // Not recommended
       *
       *     expect([1, 2, 3]).to.have.lengthOf(3); // Recommended
       *     expect([1, 2, 3]).to.have.lengthOf.above(2); // Not recommended
       *
       * Add `.not` earlier in the chain to negate `.above`.
       *
       *     expect(2).to.equal(2); // Recommended
       *     expect(1).to.not.be.above(2); // Not recommended
       *
       * `.above` accepts an optional `msg` argument which is a custom error message
       * to show when the assertion fails. The message can also be given as the
       * second argument to `expect`.
       *
       *     expect(1).to.be.above(2, 'nooo why fail??');
       *     expect(1, 'nooo why fail??').to.be.above(2);
       *
       * The aliases `.gt` and `.greaterThan` can be used interchangeably with
       * `.above`.
       *
       * @name above
       * @alias gt
       * @alias greaterThan
       * @param {Number} n
       * @param {String} msg _optional_
       * @namespace BDD
       * @api public
       */

      function assertAbove (n, msg) {
        if (msg) flag(this, 'message', msg);
        var obj = flag(this, 'object')
          , doLength = flag(this, 'doLength')
          , flagMsg = flag(this, 'message')
          , msgPrefix = ((flagMsg) ? flagMsg + ': ' : '')
          , ssfi = flag(this, 'ssfi')
          , objType = _.type(obj).toLowerCase()
          , nType = _.type(n).toLowerCase()
          , errorMessage
          , shouldThrow = true;

        if (doLength && objType !== 'map' && objType !== 'set') {
          new Assertion(obj, flagMsg, ssfi, true).to.have.property('length');
        }

        if (!doLength && (objType === 'date' && nType !== 'date')) {
          errorMessage = msgPrefix + 'the argument to above must be a date';
        } else if (nType !== 'number' && (doLength || objType === 'number')) {
          errorMessage = msgPrefix + 'the argument to above must be a number';
        } else if (!doLength && (objType !== 'date' && objType !== 'number')) {
          var printObj = (objType === 'string') ? "'" + obj + "'" : obj;
          errorMessage = msgPrefix + 'expected ' + printObj + ' to be a number or a date';
        } else {
          shouldThrow = false;
        }

        if (shouldThrow) {
          throw new AssertionError(errorMessage, undefined, ssfi);
        }

        if (doLength) {
          var descriptor = 'length'
            , itemsCount;
          if (objType === 'map' || objType === 'set') {
            descriptor = 'size';
            itemsCount = obj.size;
          } else {
            itemsCount = obj.length;
          }
          this.assert(
              itemsCount > n
            , 'expected #{this} to have a ' + descriptor + ' above #{exp} but got #{act}'
            , 'expected #{this} to not have a ' + descriptor + ' above #{exp}'
            , n
            , itemsCount
          );
        } else {
          this.assert(
              obj > n
            , 'expected #{this} to be above #{exp}'
            , 'expected #{this} to be at most #{exp}'
            , n
          );
        }
      }

      Assertion.addMethod('above', assertAbove);
      Assertion.addMethod('gt', assertAbove);
      Assertion.addMethod('greaterThan', assertAbove);

      /**
       * ### .least(n[, msg])
       *
       * Asserts that the target is a number or a date greater than or equal to the given
       * number or date `n` respectively. However, it's often best to assert that the target is equal to
       * its expected value.
       *
       *     expect(2).to.equal(2); // Recommended
       *     expect(2).to.be.at.least(1); // Not recommended
       *     expect(2).to.be.at.least(2); // Not recommended
       *
       * Add `.lengthOf` earlier in the chain to assert that the target's `length`
       * or `size` is greater than or equal to the given number `n`.
       *
       *     expect('foo').to.have.lengthOf(3); // Recommended
       *     expect('foo').to.have.lengthOf.at.least(2); // Not recommended
       *
       *     expect([1, 2, 3]).to.have.lengthOf(3); // Recommended
       *     expect([1, 2, 3]).to.have.lengthOf.at.least(2); // Not recommended
       *
       * Add `.not` earlier in the chain to negate `.least`.
       *
       *     expect(1).to.equal(1); // Recommended
       *     expect(1).to.not.be.at.least(2); // Not recommended
       *
       * `.least` accepts an optional `msg` argument which is a custom error message
       * to show when the assertion fails. The message can also be given as the
       * second argument to `expect`.
       *
       *     expect(1).to.be.at.least(2, 'nooo why fail??');
       *     expect(1, 'nooo why fail??').to.be.at.least(2);
       *
       * The aliases `.gte` and `.greaterThanOrEqual` can be used interchangeably with
       * `.least`.
       *
       * @name least
       * @alias gte
       * @alias greaterThanOrEqual
       * @param {Number} n
       * @param {String} msg _optional_
       * @namespace BDD
       * @api public
       */

      function assertLeast (n, msg) {
        if (msg) flag(this, 'message', msg);
        var obj = flag(this, 'object')
          , doLength = flag(this, 'doLength')
          , flagMsg = flag(this, 'message')
          , msgPrefix = ((flagMsg) ? flagMsg + ': ' : '')
          , ssfi = flag(this, 'ssfi')
          , objType = _.type(obj).toLowerCase()
          , nType = _.type(n).toLowerCase()
          , errorMessage
          , shouldThrow = true;

        if (doLength && objType !== 'map' && objType !== 'set') {
          new Assertion(obj, flagMsg, ssfi, true).to.have.property('length');
        }

        if (!doLength && (objType === 'date' && nType !== 'date')) {
          errorMessage = msgPrefix + 'the argument to least must be a date';
        } else if (nType !== 'number' && (doLength || objType === 'number')) {
          errorMessage = msgPrefix + 'the argument to least must be a number';
        } else if (!doLength && (objType !== 'date' && objType !== 'number')) {
          var printObj = (objType === 'string') ? "'" + obj + "'" : obj;
          errorMessage = msgPrefix + 'expected ' + printObj + ' to be a number or a date';
        } else {
          shouldThrow = false;
        }

        if (shouldThrow) {
          throw new AssertionError(errorMessage, undefined, ssfi);
        }

        if (doLength) {
          var descriptor = 'length'
            , itemsCount;
          if (objType === 'map' || objType === 'set') {
            descriptor = 'size';
            itemsCount = obj.size;
          } else {
            itemsCount = obj.length;
          }
          this.assert(
              itemsCount >= n
            , 'expected #{this} to have a ' + descriptor + ' at least #{exp} but got #{act}'
            , 'expected #{this} to have a ' + descriptor + ' below #{exp}'
            , n
            , itemsCount
          );
        } else {
          this.assert(
              obj >= n
            , 'expected #{this} to be at least #{exp}'
            , 'expected #{this} to be below #{exp}'
            , n
          );
        }
      }

      Assertion.addMethod('least', assertLeast);
      Assertion.addMethod('gte', assertLeast);
      Assertion.addMethod('greaterThanOrEqual', assertLeast);

      /**
       * ### .below(n[, msg])
       *
       * Asserts that the target is a number or a date less than the given number or date `n` respectively.
       * However, it's often best to assert that the target is equal to its expected
       * value.
       *
       *     expect(1).to.equal(1); // Recommended
       *     expect(1).to.be.below(2); // Not recommended
       *
       * Add `.lengthOf` earlier in the chain to assert that the target's `length`
       * or `size` is less than the given number `n`.
       *
       *     expect('foo').to.have.lengthOf(3); // Recommended
       *     expect('foo').to.have.lengthOf.below(4); // Not recommended
       *
       *     expect([1, 2, 3]).to.have.length(3); // Recommended
       *     expect([1, 2, 3]).to.have.lengthOf.below(4); // Not recommended
       *
       * Add `.not` earlier in the chain to negate `.below`.
       *
       *     expect(2).to.equal(2); // Recommended
       *     expect(2).to.not.be.below(1); // Not recommended
       *
       * `.below` accepts an optional `msg` argument which is a custom error message
       * to show when the assertion fails. The message can also be given as the
       * second argument to `expect`.
       *
       *     expect(2).to.be.below(1, 'nooo why fail??');
       *     expect(2, 'nooo why fail??').to.be.below(1);
       *
       * The aliases `.lt` and `.lessThan` can be used interchangeably with
       * `.below`.
       *
       * @name below
       * @alias lt
       * @alias lessThan
       * @param {Number} n
       * @param {String} msg _optional_
       * @namespace BDD
       * @api public
       */

      function assertBelow (n, msg) {
        if (msg) flag(this, 'message', msg);
        var obj = flag(this, 'object')
          , doLength = flag(this, 'doLength')
          , flagMsg = flag(this, 'message')
          , msgPrefix = ((flagMsg) ? flagMsg + ': ' : '')
          , ssfi = flag(this, 'ssfi')
          , objType = _.type(obj).toLowerCase()
          , nType = _.type(n).toLowerCase()
          , errorMessage
          , shouldThrow = true;

        if (doLength && objType !== 'map' && objType !== 'set') {
          new Assertion(obj, flagMsg, ssfi, true).to.have.property('length');
        }

        if (!doLength && (objType === 'date' && nType !== 'date')) {
          errorMessage = msgPrefix + 'the argument to below must be a date';
        } else if (nType !== 'number' && (doLength || objType === 'number')) {
          errorMessage = msgPrefix + 'the argument to below must be a number';
        } else if (!doLength && (objType !== 'date' && objType !== 'number')) {
          var printObj = (objType === 'string') ? "'" + obj + "'" : obj;
          errorMessage = msgPrefix + 'expected ' + printObj + ' to be a number or a date';
        } else {
          shouldThrow = false;
        }

        if (shouldThrow) {
          throw new AssertionError(errorMessage, undefined, ssfi);
        }

        if (doLength) {
          var descriptor = 'length'
            , itemsCount;
          if (objType === 'map' || objType === 'set') {
            descriptor = 'size';
            itemsCount = obj.size;
          } else {
            itemsCount = obj.length;
          }
          this.assert(
              itemsCount < n
            , 'expected #{this} to have a ' + descriptor + ' below #{exp} but got #{act}'
            , 'expected #{this} to not have a ' + descriptor + ' below #{exp}'
            , n
            , itemsCount
          );
        } else {
          this.assert(
              obj < n
            , 'expected #{this} to be below #{exp}'
            , 'expected #{this} to be at least #{exp}'
            , n
          );
        }
      }

      Assertion.addMethod('below', assertBelow);
      Assertion.addMethod('lt', assertBelow);
      Assertion.addMethod('lessThan', assertBelow);

      /**
       * ### .most(n[, msg])
       *
       * Asserts that the target is a number or a date less than or equal to the given number
       * or date `n` respectively. However, it's often best to assert that the target is equal to its
       * expected value.
       *
       *     expect(1).to.equal(1); // Recommended
       *     expect(1).to.be.at.most(2); // Not recommended
       *     expect(1).to.be.at.most(1); // Not recommended
       *
       * Add `.lengthOf` earlier in the chain to assert that the target's `length`
       * or `size` is less than or equal to the given number `n`.
       *
       *     expect('foo').to.have.lengthOf(3); // Recommended
       *     expect('foo').to.have.lengthOf.at.most(4); // Not recommended
       *
       *     expect([1, 2, 3]).to.have.lengthOf(3); // Recommended
       *     expect([1, 2, 3]).to.have.lengthOf.at.most(4); // Not recommended
       *
       * Add `.not` earlier in the chain to negate `.most`.
       *
       *     expect(2).to.equal(2); // Recommended
       *     expect(2).to.not.be.at.most(1); // Not recommended
       *
       * `.most` accepts an optional `msg` argument which is a custom error message
       * to show when the assertion fails. The message can also be given as the
       * second argument to `expect`.
       *
       *     expect(2).to.be.at.most(1, 'nooo why fail??');
       *     expect(2, 'nooo why fail??').to.be.at.most(1);
       *
       * The aliases `.lte` and `.lessThanOrEqual` can be used interchangeably with
       * `.most`.
       *
       * @name most
       * @alias lte
       * @alias lessThanOrEqual
       * @param {Number} n
       * @param {String} msg _optional_
       * @namespace BDD
       * @api public
       */

      function assertMost (n, msg) {
        if (msg) flag(this, 'message', msg);
        var obj = flag(this, 'object')
          , doLength = flag(this, 'doLength')
          , flagMsg = flag(this, 'message')
          , msgPrefix = ((flagMsg) ? flagMsg + ': ' : '')
          , ssfi = flag(this, 'ssfi')
          , objType = _.type(obj).toLowerCase()
          , nType = _.type(n).toLowerCase()
          , errorMessage
          , shouldThrow = true;

        if (doLength && objType !== 'map' && objType !== 'set') {
          new Assertion(obj, flagMsg, ssfi, true).to.have.property('length');
        }

        if (!doLength && (objType === 'date' && nType !== 'date')) {
          errorMessage = msgPrefix + 'the argument to most must be a date';
        } else if (nType !== 'number' && (doLength || objType === 'number')) {
          errorMessage = msgPrefix + 'the argument to most must be a number';
        } else if (!doLength && (objType !== 'date' && objType !== 'number')) {
          var printObj = (objType === 'string') ? "'" + obj + "'" : obj;
          errorMessage = msgPrefix + 'expected ' + printObj + ' to be a number or a date';
        } else {
          shouldThrow = false;
        }

        if (shouldThrow) {
          throw new AssertionError(errorMessage, undefined, ssfi);
        }

        if (doLength) {
          var descriptor = 'length'
            , itemsCount;
          if (objType === 'map' || objType === 'set') {
            descriptor = 'size';
            itemsCount = obj.size;
          } else {
            itemsCount = obj.length;
          }
          this.assert(
              itemsCount <= n
            , 'expected #{this} to have a ' + descriptor + ' at most #{exp} but got #{act}'
            , 'expected #{this} to have a ' + descriptor + ' above #{exp}'
            , n
            , itemsCount
          );
        } else {
          this.assert(
              obj <= n
            , 'expected #{this} to be at most #{exp}'
            , 'expected #{this} to be above #{exp}'
            , n
          );
        }
      }

      Assertion.addMethod('most', assertMost);
      Assertion.addMethod('lte', assertMost);
      Assertion.addMethod('lessThanOrEqual', assertMost);

      /**
       * ### .within(start, finish[, msg])
       *
       * Asserts that the target is a number or a date greater than or equal to the given
       * number or date `start`, and less than or equal to the given number or date `finish` respectively.
       * However, it's often best to assert that the target is equal to its expected
       * value.
       *
       *     expect(2).to.equal(2); // Recommended
       *     expect(2).to.be.within(1, 3); // Not recommended
       *     expect(2).to.be.within(2, 3); // Not recommended
       *     expect(2).to.be.within(1, 2); // Not recommended
       *
       * Add `.lengthOf` earlier in the chain to assert that the target's `length`
       * or `size` is greater than or equal to the given number `start`, and less
       * than or equal to the given number `finish`.
       *
       *     expect('foo').to.have.lengthOf(3); // Recommended
       *     expect('foo').to.have.lengthOf.within(2, 4); // Not recommended
       *
       *     expect([1, 2, 3]).to.have.lengthOf(3); // Recommended
       *     expect([1, 2, 3]).to.have.lengthOf.within(2, 4); // Not recommended
       *
       * Add `.not` earlier in the chain to negate `.within`.
       *
       *     expect(1).to.equal(1); // Recommended
       *     expect(1).to.not.be.within(2, 4); // Not recommended
       *
       * `.within` accepts an optional `msg` argument which is a custom error
       * message to show when the assertion fails. The message can also be given as
       * the second argument to `expect`.
       *
       *     expect(4).to.be.within(1, 3, 'nooo why fail??');
       *     expect(4, 'nooo why fail??').to.be.within(1, 3);
       *
       * @name within
       * @param {Number} start lower bound inclusive
       * @param {Number} finish upper bound inclusive
       * @param {String} msg _optional_
       * @namespace BDD
       * @api public
       */

      Assertion.addMethod('within', function (start, finish, msg) {
        if (msg) flag(this, 'message', msg);
        var obj = flag(this, 'object')
          , doLength = flag(this, 'doLength')
          , flagMsg = flag(this, 'message')
          , msgPrefix = ((flagMsg) ? flagMsg + ': ' : '')
          , ssfi = flag(this, 'ssfi')
          , objType = _.type(obj).toLowerCase()
          , startType = _.type(start).toLowerCase()
          , finishType = _.type(finish).toLowerCase()
          , errorMessage
          , shouldThrow = true
          , range = (startType === 'date' && finishType === 'date')
              ? start.toISOString() + '..' + finish.toISOString()
              : start + '..' + finish;

        if (doLength && objType !== 'map' && objType !== 'set') {
          new Assertion(obj, flagMsg, ssfi, true).to.have.property('length');
        }

        if (!doLength && (objType === 'date' && (startType !== 'date' || finishType !== 'date'))) {
          errorMessage = msgPrefix + 'the arguments to within must be dates';
        } else if ((startType !== 'number' || finishType !== 'number') && (doLength || objType === 'number')) {
          errorMessage = msgPrefix + 'the arguments to within must be numbers';
        } else if (!doLength && (objType !== 'date' && objType !== 'number')) {
          var printObj = (objType === 'string') ? "'" + obj + "'" : obj;
          errorMessage = msgPrefix + 'expected ' + printObj + ' to be a number or a date';
        } else {
          shouldThrow = false;
        }

        if (shouldThrow) {
          throw new AssertionError(errorMessage, undefined, ssfi);
        }

        if (doLength) {
          var descriptor = 'length'
            , itemsCount;
          if (objType === 'map' || objType === 'set') {
            descriptor = 'size';
            itemsCount = obj.size;
          } else {
            itemsCount = obj.length;
          }
          this.assert(
              itemsCount >= start && itemsCount <= finish
            , 'expected #{this} to have a ' + descriptor + ' within ' + range
            , 'expected #{this} to not have a ' + descriptor + ' within ' + range
          );
        } else {
          this.assert(
              obj >= start && obj <= finish
            , 'expected #{this} to be within ' + range
            , 'expected #{this} to not be within ' + range
          );
        }
      });

      /**
       * ### .instanceof(constructor[, msg])
       *
       * Asserts that the target is an instance of the given `constructor`.
       *
       *     function Cat () { }
       *
       *     expect(new Cat()).to.be.an.instanceof(Cat);
       *     expect([1, 2]).to.be.an.instanceof(Array);
       *
       * Add `.not` earlier in the chain to negate `.instanceof`.
       *
       *     expect({a: 1}).to.not.be.an.instanceof(Array);
       *
       * `.instanceof` accepts an optional `msg` argument which is a custom error
       * message to show when the assertion fails. The message can also be given as
       * the second argument to `expect`.
       *
       *     expect(1).to.be.an.instanceof(Array, 'nooo why fail??');
       *     expect(1, 'nooo why fail??').to.be.an.instanceof(Array);
       *
       * Due to limitations in ES5, `.instanceof` may not always work as expected
       * when using a transpiler such as Babel or TypeScript. In particular, it may
       * produce unexpected results when subclassing built-in object such as
       * `Array`, `Error`, and `Map`. See your transpiler's docs for details:
       *
       * - ([Babel](https://babeljs.io/docs/usage/caveats/#classes))
       * - ([TypeScript](https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work))
       *
       * The alias `.instanceOf` can be used interchangeably with `.instanceof`.
       *
       * @name instanceof
       * @param {Constructor} constructor
       * @param {String} msg _optional_
       * @alias instanceOf
       * @namespace BDD
       * @api public
       */

      function assertInstanceOf (constructor, msg) {
        if (msg) flag(this, 'message', msg);

        var target = flag(this, 'object');
        var ssfi = flag(this, 'ssfi');
        var flagMsg = flag(this, 'message');

        try {
          var isInstanceOf = target instanceof constructor;
        } catch (err) {
          if (err instanceof TypeError) {
            flagMsg = flagMsg ? flagMsg + ': ' : '';
            throw new AssertionError(
              flagMsg + 'The instanceof assertion needs a constructor but '
                + _.type(constructor) + ' was given.',
              undefined,
              ssfi
            );
          }
          throw err;
        }

        var name = _.getName(constructor);
        if (name === null) {
          name = 'an unnamed constructor';
        }

        this.assert(
            isInstanceOf
          , 'expected #{this} to be an instance of ' + name
          , 'expected #{this} to not be an instance of ' + name
        );
      }
      Assertion.addMethod('instanceof', assertInstanceOf);
      Assertion.addMethod('instanceOf', assertInstanceOf);

      /**
       * ### .property(name[, val[, msg]])
       *
       * Asserts that the target has a property with the given key `name`.
       *
       *     expect({a: 1}).to.have.property('a');
       *
       * When `val` is provided, `.property` also asserts that the property's value
       * is equal to the given `val`.
       *
       *     expect({a: 1}).to.have.property('a', 1);
       *
       * By default, strict (`===`) equality is used. Add `.deep` earlier in the
       * chain to use deep equality instead. See the `deep-eql` project page for
       * info on the deep equality algorithm: https://github.com/chaijs/deep-eql.
       *
       *     // Target object deeply (but not strictly) has property `x: {a: 1}`
       *     expect({x: {a: 1}}).to.have.deep.property('x', {a: 1});
       *     expect({x: {a: 1}}).to.not.have.property('x', {a: 1});
       *
       * The target's enumerable and non-enumerable properties are always included
       * in the search. By default, both own and inherited properties are included.
       * Add `.own` earlier in the chain to exclude inherited properties from the
       * search.
       *
       *     Object.prototype.b = 2;
       *
       *     expect({a: 1}).to.have.own.property('a');
       *     expect({a: 1}).to.have.own.property('a', 1);
       *     expect({a: 1}).to.have.property('b');
       *     expect({a: 1}).to.not.have.own.property('b');
       *
       * `.deep` and `.own` can be combined.
       *
       *     expect({x: {a: 1}}).to.have.deep.own.property('x', {a: 1});
       *
       * Add `.nested` earlier in the chain to enable dot- and bracket-notation when
       * referencing nested properties.
       *
       *     expect({a: {b: ['x', 'y']}}).to.have.nested.property('a.b[1]');
       *     expect({a: {b: ['x', 'y']}}).to.have.nested.property('a.b[1]', 'y');
       *
       * If `.` or `[]` are part of an actual property name, they can be escaped by
       * adding two backslashes before them.
       *
       *     expect({'.a': {'[b]': 'x'}}).to.have.nested.property('\\.a.\\[b\\]');
       *
       * `.deep` and `.nested` can be combined.
       *
       *     expect({a: {b: [{c: 3}]}})
       *       .to.have.deep.nested.property('a.b[0]', {c: 3});
       *
       * `.own` and `.nested` cannot be combined.
       *
       * Add `.not` earlier in the chain to negate `.property`.
       *
       *     expect({a: 1}).to.not.have.property('b');
       *
       * However, it's dangerous to negate `.property` when providing `val`. The
       * problem is that it creates uncertain expectations by asserting that the
       * target either doesn't have a property with the given key `name`, or that it
       * does have a property with the given key `name` but its value isn't equal to
       * the given `val`. It's often best to identify the exact output that's
       * expected, and then write an assertion that only accepts that exact output.
       *
       * When the target isn't expected to have a property with the given key
       * `name`, it's often best to assert exactly that.
       *
       *     expect({b: 2}).to.not.have.property('a'); // Recommended
       *     expect({b: 2}).to.not.have.property('a', 1); // Not recommended
       *
       * When the target is expected to have a property with the given key `name`,
       * it's often best to assert that the property has its expected value, rather
       * than asserting that it doesn't have one of many unexpected values.
       *
       *     expect({a: 3}).to.have.property('a', 3); // Recommended
       *     expect({a: 3}).to.not.have.property('a', 1); // Not recommended
       *
       * `.property` changes the target of any assertions that follow in the chain
       * to be the value of the property from the original target object.
       *
       *     expect({a: 1}).to.have.property('a').that.is.a('number');
       *
       * `.property` accepts an optional `msg` argument which is a custom error
       * message to show when the assertion fails. The message can also be given as
       * the second argument to `expect`. When not providing `val`, only use the
       * second form.
       *
       *     // Recommended
       *     expect({a: 1}).to.have.property('a', 2, 'nooo why fail??');
       *     expect({a: 1}, 'nooo why fail??').to.have.property('a', 2);
       *     expect({a: 1}, 'nooo why fail??').to.have.property('b');
       *
       *     // Not recommended
       *     expect({a: 1}).to.have.property('b', undefined, 'nooo why fail??');
       *
       * The above assertion isn't the same thing as not providing `val`. Instead,
       * it's asserting that the target object has a `b` property that's equal to
       * `undefined`.
       *
       * The assertions `.ownProperty` and `.haveOwnProperty` can be used
       * interchangeably with `.own.property`.
       *
       * @name property
       * @param {String} name
       * @param {Mixed} val (optional)
       * @param {String} msg _optional_
       * @returns value of property for chaining
       * @namespace BDD
       * @api public
       */

      function assertProperty (name, val, msg) {
        if (msg) flag(this, 'message', msg);

        var isNested = flag(this, 'nested')
          , isOwn = flag(this, 'own')
          , flagMsg = flag(this, 'message')
          , obj = flag(this, 'object')
          , ssfi = flag(this, 'ssfi')
          , nameType = typeof name;

        flagMsg = flagMsg ? flagMsg + ': ' : '';

        if (isNested) {
          if (nameType !== 'string') {
            throw new AssertionError(
              flagMsg + 'the argument to property must be a string when using nested syntax',
              undefined,
              ssfi
            );
          }
        } else {
          if (nameType !== 'string' && nameType !== 'number' && nameType !== 'symbol') {
            throw new AssertionError(
              flagMsg + 'the argument to property must be a string, number, or symbol',
              undefined,
              ssfi
            );
          }
        }

        if (isNested && isOwn) {
          throw new AssertionError(
            flagMsg + 'The "nested" and "own" flags cannot be combined.',
            undefined,
            ssfi
          );
        }

        if (obj === null || obj === undefined) {
          throw new AssertionError(
            flagMsg + 'Target cannot be null or undefined.',
            undefined,
            ssfi
          );
        }

        var isDeep = flag(this, 'deep')
          , negate = flag(this, 'negate')
          , pathInfo = isNested ? _.getPathInfo(obj, name) : null
          , value = isNested ? pathInfo.value : obj[name];

        var descriptor = '';
        if (isDeep) descriptor += 'deep ';
        if (isOwn) descriptor += 'own ';
        if (isNested) descriptor += 'nested ';
        descriptor += 'property ';

        var hasProperty;
        if (isOwn) hasProperty = Object.prototype.hasOwnProperty.call(obj, name);
        else if (isNested) hasProperty = pathInfo.exists;
        else hasProperty = _.hasProperty(obj, name);

        // When performing a negated assertion for both name and val, merely having
        // a property with the given name isn't enough to cause the assertion to
        // fail. It must both have a property with the given name, and the value of
        // that property must equal the given val. Therefore, skip this assertion in
        // favor of the next.
        if (!negate || arguments.length === 1) {
          this.assert(
              hasProperty
            , 'expected #{this} to have ' + descriptor + _.inspect(name)
            , 'expected #{this} to not have ' + descriptor + _.inspect(name));
        }

        if (arguments.length > 1) {
          this.assert(
              hasProperty && (isDeep ? _.eql(val, value) : val === value)
            , 'expected #{this} to have ' + descriptor + _.inspect(name) + ' of #{exp}, but got #{act}'
            , 'expected #{this} to not have ' + descriptor + _.inspect(name) + ' of #{act}'
            , val
            , value
          );
        }

        flag(this, 'object', value);
      }

      Assertion.addMethod('property', assertProperty);

      function assertOwnProperty (name, value, msg) {
        flag(this, 'own', true);
        assertProperty.apply(this, arguments);
      }

      Assertion.addMethod('ownProperty', assertOwnProperty);
      Assertion.addMethod('haveOwnProperty', assertOwnProperty);

      /**
       * ### .ownPropertyDescriptor(name[, descriptor[, msg]])
       *
       * Asserts that the target has its own property descriptor with the given key
       * `name`. Enumerable and non-enumerable properties are included in the
       * search.
       *
       *     expect({a: 1}).to.have.ownPropertyDescriptor('a');
       *
       * When `descriptor` is provided, `.ownPropertyDescriptor` also asserts that
       * the property's descriptor is deeply equal to the given `descriptor`. See
       * the `deep-eql` project page for info on the deep equality algorithm:
       * https://github.com/chaijs/deep-eql.
       *
       *     expect({a: 1}).to.have.ownPropertyDescriptor('a', {
       *       configurable: true,
       *       enumerable: true,
       *       writable: true,
       *       value: 1,
       *     });
       *
       * Add `.not` earlier in the chain to negate `.ownPropertyDescriptor`.
       *
       *     expect({a: 1}).to.not.have.ownPropertyDescriptor('b');
       *
       * However, it's dangerous to negate `.ownPropertyDescriptor` when providing
       * a `descriptor`. The problem is that it creates uncertain expectations by
       * asserting that the target either doesn't have a property descriptor with
       * the given key `name`, or that it does have a property descriptor with the
       * given key `name` but it’s not deeply equal to the given `descriptor`. It's
       * often best to identify the exact output that's expected, and then write an
       * assertion that only accepts that exact output.
       *
       * When the target isn't expected to have a property descriptor with the given
       * key `name`, it's often best to assert exactly that.
       *
       *     // Recommended
       *     expect({b: 2}).to.not.have.ownPropertyDescriptor('a');
       *
       *     // Not recommended
       *     expect({b: 2}).to.not.have.ownPropertyDescriptor('a', {
       *       configurable: true,
       *       enumerable: true,
       *       writable: true,
       *       value: 1,
       *     });
       *
       * When the target is expected to have a property descriptor with the given
       * key `name`, it's often best to assert that the property has its expected
       * descriptor, rather than asserting that it doesn't have one of many
       * unexpected descriptors.
       *
       *     // Recommended
       *     expect({a: 3}).to.have.ownPropertyDescriptor('a', {
       *       configurable: true,
       *       enumerable: true,
       *       writable: true,
       *       value: 3,
       *     });
       *
       *     // Not recommended
       *     expect({a: 3}).to.not.have.ownPropertyDescriptor('a', {
       *       configurable: true,
       *       enumerable: true,
       *       writable: true,
       *       value: 1,
       *     });
       *
       * `.ownPropertyDescriptor` changes the target of any assertions that follow
       * in the chain to be the value of the property descriptor from the original
       * target object.
       *
       *     expect({a: 1}).to.have.ownPropertyDescriptor('a')
       *       .that.has.property('enumerable', true);
       *
       * `.ownPropertyDescriptor` accepts an optional `msg` argument which is a
       * custom error message to show when the assertion fails. The message can also
       * be given as the second argument to `expect`. When not providing
       * `descriptor`, only use the second form.
       *
       *     // Recommended
       *     expect({a: 1}).to.have.ownPropertyDescriptor('a', {
       *       configurable: true,
       *       enumerable: true,
       *       writable: true,
       *       value: 2,
       *     }, 'nooo why fail??');
       *
       *     // Recommended
       *     expect({a: 1}, 'nooo why fail??').to.have.ownPropertyDescriptor('a', {
       *       configurable: true,
       *       enumerable: true,
       *       writable: true,
       *       value: 2,
       *     });
       *
       *     // Recommended
       *     expect({a: 1}, 'nooo why fail??').to.have.ownPropertyDescriptor('b');
       *
       *     // Not recommended
       *     expect({a: 1})
       *       .to.have.ownPropertyDescriptor('b', undefined, 'nooo why fail??');
       *
       * The above assertion isn't the same thing as not providing `descriptor`.
       * Instead, it's asserting that the target object has a `b` property
       * descriptor that's deeply equal to `undefined`.
       *
       * The alias `.haveOwnPropertyDescriptor` can be used interchangeably with
       * `.ownPropertyDescriptor`.
       *
       * @name ownPropertyDescriptor
       * @alias haveOwnPropertyDescriptor
       * @param {String} name
       * @param {Object} descriptor _optional_
       * @param {String} msg _optional_
       * @namespace BDD
       * @api public
       */

      function assertOwnPropertyDescriptor (name, descriptor, msg) {
        if (typeof descriptor === 'string') {
          msg = descriptor;
          descriptor = null;
        }
        if (msg) flag(this, 'message', msg);
        var obj = flag(this, 'object');
        var actualDescriptor = Object.getOwnPropertyDescriptor(Object(obj), name);
        if (actualDescriptor && descriptor) {
          this.assert(
              _.eql(descriptor, actualDescriptor)
            , 'expected the own property descriptor for ' + _.inspect(name) + ' on #{this} to match ' + _.inspect(descriptor) + ', got ' + _.inspect(actualDescriptor)
            , 'expected the own property descriptor for ' + _.inspect(name) + ' on #{this} to not match ' + _.inspect(descriptor)
            , descriptor
            , actualDescriptor
            , true
          );
        } else {
          this.assert(
              actualDescriptor
            , 'expected #{this} to have an own property descriptor for ' + _.inspect(name)
            , 'expected #{this} to not have an own property descriptor for ' + _.inspect(name)
          );
        }
        flag(this, 'object', actualDescriptor);
      }

      Assertion.addMethod('ownPropertyDescriptor', assertOwnPropertyDescriptor);
      Assertion.addMethod('haveOwnPropertyDescriptor', assertOwnPropertyDescriptor);

      /**
       * ### .lengthOf(n[, msg])
       *
       * Asserts that the target's `length` or `size` is equal to the given number
       * `n`.
       *
       *     expect([1, 2, 3]).to.have.lengthOf(3);
       *     expect('foo').to.have.lengthOf(3);
       *     expect(new Set([1, 2, 3])).to.have.lengthOf(3);
       *     expect(new Map([['a', 1], ['b', 2], ['c', 3]])).to.have.lengthOf(3);
       *
       * Add `.not` earlier in the chain to negate `.lengthOf`. However, it's often
       * best to assert that the target's `length` property is equal to its expected
       * value, rather than not equal to one of many unexpected values.
       *
       *     expect('foo').to.have.lengthOf(3); // Recommended
       *     expect('foo').to.not.have.lengthOf(4); // Not recommended
       *
       * `.lengthOf` accepts an optional `msg` argument which is a custom error
       * message to show when the assertion fails. The message can also be given as
       * the second argument to `expect`.
       *
       *     expect([1, 2, 3]).to.have.lengthOf(2, 'nooo why fail??');
       *     expect([1, 2, 3], 'nooo why fail??').to.have.lengthOf(2);
       *
       * `.lengthOf` can also be used as a language chain, causing all `.above`,
       * `.below`, `.least`, `.most`, and `.within` assertions that follow in the
       * chain to use the target's `length` property as the target. However, it's
       * often best to assert that the target's `length` property is equal to its
       * expected length, rather than asserting that its `length` property falls
       * within some range of values.
       *
       *     // Recommended
       *     expect([1, 2, 3]).to.have.lengthOf(3);
       *
       *     // Not recommended
       *     expect([1, 2, 3]).to.have.lengthOf.above(2);
       *     expect([1, 2, 3]).to.have.lengthOf.below(4);
       *     expect([1, 2, 3]).to.have.lengthOf.at.least(3);
       *     expect([1, 2, 3]).to.have.lengthOf.at.most(3);
       *     expect([1, 2, 3]).to.have.lengthOf.within(2,4);
       *
       * Due to a compatibility issue, the alias `.length` can't be chained directly
       * off of an uninvoked method such as `.a`. Therefore, `.length` can't be used
       * interchangeably with `.lengthOf` in every situation. It's recommended to
       * always use `.lengthOf` instead of `.length`.
       *
       *     expect([1, 2, 3]).to.have.a.length(3); // incompatible; throws error
       *     expect([1, 2, 3]).to.have.a.lengthOf(3);  // passes as expected
       *
       * @name lengthOf
       * @alias length
       * @param {Number} n
       * @param {String} msg _optional_
       * @namespace BDD
       * @api public
       */

      function assertLengthChain () {
        flag(this, 'doLength', true);
      }

      function assertLength (n, msg) {
        if (msg) flag(this, 'message', msg);
        var obj = flag(this, 'object')
          , objType = _.type(obj).toLowerCase()
          , flagMsg = flag(this, 'message')
          , ssfi = flag(this, 'ssfi')
          , descriptor = 'length'
          , itemsCount;

        switch (objType) {
          case 'map':
          case 'set':
            descriptor = 'size';
            itemsCount = obj.size;
            break;
          default:
            new Assertion(obj, flagMsg, ssfi, true).to.have.property('length');
            itemsCount = obj.length;
        }

        this.assert(
            itemsCount == n
          , 'expected #{this} to have a ' + descriptor + ' of #{exp} but got #{act}'
          , 'expected #{this} to not have a ' + descriptor + ' of #{act}'
          , n
          , itemsCount
        );
      }

      Assertion.addChainableMethod('length', assertLength, assertLengthChain);
      Assertion.addChainableMethod('lengthOf', assertLength, assertLengthChain);

      /**
       * ### .match(re[, msg])
       *
       * Asserts that the target matches the given regular expression `re`.
       *
       *     expect('foobar').to.match(/^foo/);
       *
       * Add `.not` earlier in the chain to negate `.match`.
       *
       *     expect('foobar').to.not.match(/taco/);
       *
       * `.match` accepts an optional `msg` argument which is a custom error message
       * to show when the assertion fails. The message can also be given as the
       * second argument to `expect`.
       *
       *     expect('foobar').to.match(/taco/, 'nooo why fail??');
       *     expect('foobar', 'nooo why fail??').to.match(/taco/);
       *
       * The alias `.matches` can be used interchangeably with `.match`.
       *
       * @name match
       * @alias matches
       * @param {RegExp} re
       * @param {String} msg _optional_
       * @namespace BDD
       * @api public
       */
      function assertMatch(re, msg) {
        if (msg) flag(this, 'message', msg);
        var obj = flag(this, 'object');
        this.assert(
            re.exec(obj)
          , 'expected #{this} to match ' + re
          , 'expected #{this} not to match ' + re
        );
      }

      Assertion.addMethod('match', assertMatch);
      Assertion.addMethod('matches', assertMatch);

      /**
       * ### .string(str[, msg])
       *
       * Asserts that the target string contains the given substring `str`.
       *
       *     expect('foobar').to.have.string('bar');
       *
       * Add `.not` earlier in the chain to negate `.string`.
       *
       *     expect('foobar').to.not.have.string('taco');
       *
       * `.string` accepts an optional `msg` argument which is a custom error
       * message to show when the assertion fails. The message can also be given as
       * the second argument to `expect`.
       *
       *     expect('foobar').to.have.string('taco', 'nooo why fail??');
       *     expect('foobar', 'nooo why fail??').to.have.string('taco');
       *
       * @name string
       * @param {String} str
       * @param {String} msg _optional_
       * @namespace BDD
       * @api public
       */

      Assertion.addMethod('string', function (str, msg) {
        if (msg) flag(this, 'message', msg);
        var obj = flag(this, 'object')
          , flagMsg = flag(this, 'message')
          , ssfi = flag(this, 'ssfi');
        new Assertion(obj, flagMsg, ssfi, true).is.a('string');

        this.assert(
            ~obj.indexOf(str)
          , 'expected #{this} to contain ' + _.inspect(str)
          , 'expected #{this} to not contain ' + _.inspect(str)
        );
      });

      /**
       * ### .keys(key1[, key2[, ...]])
       *
       * Asserts that the target object, array, map, or set has the given keys. Only
       * the target's own inherited properties are included in the search.
       *
       * When the target is an object or array, keys can be provided as one or more
       * string arguments, a single array argument, or a single object argument. In
       * the latter case, only the keys in the given object matter; the values are
       * ignored.
       *
       *     expect({a: 1, b: 2}).to.have.all.keys('a', 'b');
       *     expect(['x', 'y']).to.have.all.keys(0, 1);
       *
       *     expect({a: 1, b: 2}).to.have.all.keys(['a', 'b']);
       *     expect(['x', 'y']).to.have.all.keys([0, 1]);
       *
       *     expect({a: 1, b: 2}).to.have.all.keys({a: 4, b: 5}); // ignore 4 and 5
       *     expect(['x', 'y']).to.have.all.keys({0: 4, 1: 5}); // ignore 4 and 5
       *
       * When the target is a map or set, each key must be provided as a separate
       * argument.
       *
       *     expect(new Map([['a', 1], ['b', 2]])).to.have.all.keys('a', 'b');
       *     expect(new Set(['a', 'b'])).to.have.all.keys('a', 'b');
       *
       * Because `.keys` does different things based on the target's type, it's
       * important to check the target's type before using `.keys`. See the `.a` doc
       * for info on testing a target's type.
       *
       *     expect({a: 1, b: 2}).to.be.an('object').that.has.all.keys('a', 'b');
       *
       * By default, strict (`===`) equality is used to compare keys of maps and
       * sets. Add `.deep` earlier in the chain to use deep equality instead. See
       * the `deep-eql` project page for info on the deep equality algorithm:
       * https://github.com/chaijs/deep-eql.
       *
       *     // Target set deeply (but not strictly) has key `{a: 1}`
       *     expect(new Set([{a: 1}])).to.have.all.deep.keys([{a: 1}]);
       *     expect(new Set([{a: 1}])).to.not.have.all.keys([{a: 1}]);
       *
       * By default, the target must have all of the given keys and no more. Add
       * `.any` earlier in the chain to only require that the target have at least
       * one of the given keys. Also, add `.not` earlier in the chain to negate
       * `.keys`. It's often best to add `.any` when negating `.keys`, and to use
       * `.all` when asserting `.keys` without negation.
       *
       * When negating `.keys`, `.any` is preferred because `.not.any.keys` asserts
       * exactly what's expected of the output, whereas `.not.all.keys` creates
       * uncertain expectations.
       *
       *     // Recommended; asserts that target doesn't have any of the given keys
       *     expect({a: 1, b: 2}).to.not.have.any.keys('c', 'd');
       *
       *     // Not recommended; asserts that target doesn't have all of the given
       *     // keys but may or may not have some of them
       *     expect({a: 1, b: 2}).to.not.have.all.keys('c', 'd');
       *
       * When asserting `.keys` without negation, `.all` is preferred because
       * `.all.keys` asserts exactly what's expected of the output, whereas
       * `.any.keys` creates uncertain expectations.
       *
       *     // Recommended; asserts that target has all the given keys
       *     expect({a: 1, b: 2}).to.have.all.keys('a', 'b');
       *
       *     // Not recommended; asserts that target has at least one of the given
       *     // keys but may or may not have more of them
       *     expect({a: 1, b: 2}).to.have.any.keys('a', 'b');
       *
       * Note that `.all` is used by default when neither `.all` nor `.any` appear
       * earlier in the chain. However, it's often best to add `.all` anyway because
       * it improves readability.
       *
       *     // Both assertions are identical
       *     expect({a: 1, b: 2}).to.have.all.keys('a', 'b'); // Recommended
       *     expect({a: 1, b: 2}).to.have.keys('a', 'b'); // Not recommended
       *
       * Add `.include` earlier in the chain to require that the target's keys be a
       * superset of the expected keys, rather than identical sets.
       *
       *     // Target object's keys are a superset of ['a', 'b'] but not identical
       *     expect({a: 1, b: 2, c: 3}).to.include.all.keys('a', 'b');
       *     expect({a: 1, b: 2, c: 3}).to.not.have.all.keys('a', 'b');
       *
       * However, if `.any` and `.include` are combined, only the `.any` takes
       * effect. The `.include` is ignored in this case.
       *
       *     // Both assertions are identical
       *     expect({a: 1}).to.have.any.keys('a', 'b');
       *     expect({a: 1}).to.include.any.keys('a', 'b');
       *
       * A custom error message can be given as the second argument to `expect`.
       *
       *     expect({a: 1}, 'nooo why fail??').to.have.key('b');
       *
       * The alias `.key` can be used interchangeably with `.keys`.
       *
       * @name keys
       * @alias key
       * @param {...String|Array|Object} keys
       * @namespace BDD
       * @api public
       */

      function assertKeys (keys) {
        var obj = flag(this, 'object')
          , objType = _.type(obj)
          , keysType = _.type(keys)
          , ssfi = flag(this, 'ssfi')
          , isDeep = flag(this, 'deep')
          , str
          , deepStr = ''
          , actual
          , ok = true
          , flagMsg = flag(this, 'message');

        flagMsg = flagMsg ? flagMsg + ': ' : '';
        var mixedArgsMsg = flagMsg + 'when testing keys against an object or an array you must give a single Array|Object|String argument or multiple String arguments';

        if (objType === 'Map' || objType === 'Set') {
          deepStr = isDeep ? 'deeply ' : '';
          actual = [];

          // Map and Set '.keys' aren't supported in IE 11. Therefore, use .forEach.
          obj.forEach(function (val, key) { actual.push(key); });

          if (keysType !== 'Array') {
            keys = Array.prototype.slice.call(arguments);
          }
        } else {
          actual = _.getOwnEnumerableProperties(obj);

          switch (keysType) {
            case 'Array':
              if (arguments.length > 1) {
                throw new AssertionError(mixedArgsMsg, undefined, ssfi);
              }
              break;
            case 'Object':
              if (arguments.length > 1) {
                throw new AssertionError(mixedArgsMsg, undefined, ssfi);
              }
              keys = Object.keys(keys);
              break;
            default:
              keys = Array.prototype.slice.call(arguments);
          }

          // Only stringify non-Symbols because Symbols would become "Symbol()"
          keys = keys.map(function (val) {
            return typeof val === 'symbol' ? val : String(val);
          });
        }

        if (!keys.length) {
          throw new AssertionError(flagMsg + 'keys required', undefined, ssfi);
        }

        var len = keys.length
          , any = flag(this, 'any')
          , all = flag(this, 'all')
          , expected = keys;

        if (!any && !all) {
          all = true;
        }

        // Has any
        if (any) {
          ok = expected.some(function(expectedKey) {
            return actual.some(function(actualKey) {
              if (isDeep) {
                return _.eql(expectedKey, actualKey);
              } else {
                return expectedKey === actualKey;
              }
            });
          });
        }

        // Has all
        if (all) {
          ok = expected.every(function(expectedKey) {
            return actual.some(function(actualKey) {
              if (isDeep) {
                return _.eql(expectedKey, actualKey);
              } else {
                return expectedKey === actualKey;
              }
            });
          });

          if (!flag(this, 'contains')) {
            ok = ok && keys.length == actual.length;
          }
        }

        // Key string
        if (len > 1) {
          keys = keys.map(function(key) {
            return _.inspect(key);
          });
          var last = keys.pop();
          if (all) {
            str = keys.join(', ') + ', and ' + last;
          }
          if (any) {
            str = keys.join(', ') + ', or ' + last;
          }
        } else {
          str = _.inspect(keys[0]);
        }

        // Form
        str = (len > 1 ? 'keys ' : 'key ') + str;

        // Have / include
        str = (flag(this, 'contains') ? 'contain ' : 'have ') + str;

        // Assertion
        this.assert(
            ok
          , 'expected #{this} to ' + deepStr + str
          , 'expected #{this} to not ' + deepStr + str
          , expected.slice(0).sort(_.compareByInspect)
          , actual.sort(_.compareByInspect)
          , true
        );
      }

      Assertion.addMethod('keys', assertKeys);
      Assertion.addMethod('key', assertKeys);

      /**
       * ### .throw([errorLike], [errMsgMatcher], [msg])
       *
       * When no arguments are provided, `.throw` invokes the target function and
       * asserts that an error is thrown.
       *
       *     var badFn = function () { throw new TypeError('Illegal salmon!'); };
       *
       *     expect(badFn).to.throw();
       *
       * When one argument is provided, and it's an error constructor, `.throw`
       * invokes the target function and asserts that an error is thrown that's an
       * instance of that error constructor.
       *
       *     var badFn = function () { throw new TypeError('Illegal salmon!'); };
       *
       *     expect(badFn).to.throw(TypeError);
       *
       * When one argument is provided, and it's an error instance, `.throw` invokes
       * the target function and asserts that an error is thrown that's strictly
       * (`===`) equal to that error instance.
       *
       *     var err = new TypeError('Illegal salmon!');
       *     var badFn = function () { throw err; };
       *
       *     expect(badFn).to.throw(err);
       *
       * When one argument is provided, and it's a string, `.throw` invokes the
       * target function and asserts that an error is thrown with a message that
       * contains that string.
       *
       *     var badFn = function () { throw new TypeError('Illegal salmon!'); };
       *
       *     expect(badFn).to.throw('salmon');
       *
       * When one argument is provided, and it's a regular expression, `.throw`
       * invokes the target function and asserts that an error is thrown with a
       * message that matches that regular expression.
       *
       *     var badFn = function () { throw new TypeError('Illegal salmon!'); };
       *
       *     expect(badFn).to.throw(/salmon/);
       *
       * When two arguments are provided, and the first is an error instance or
       * constructor, and the second is a string or regular expression, `.throw`
       * invokes the function and asserts that an error is thrown that fulfills both
       * conditions as described above.
       *
       *     var err = new TypeError('Illegal salmon!');
       *     var badFn = function () { throw err; };
       *
       *     expect(badFn).to.throw(TypeError, 'salmon');
       *     expect(badFn).to.throw(TypeError, /salmon/);
       *     expect(badFn).to.throw(err, 'salmon');
       *     expect(badFn).to.throw(err, /salmon/);
       *
       * Add `.not` earlier in the chain to negate `.throw`.
       *
       *     var goodFn = function () {};
       *
       *     expect(goodFn).to.not.throw();
       *
       * However, it's dangerous to negate `.throw` when providing any arguments.
       * The problem is that it creates uncertain expectations by asserting that the
       * target either doesn't throw an error, or that it throws an error but of a
       * different type than the given type, or that it throws an error of the given
       * type but with a message that doesn't include the given string. It's often
       * best to identify the exact output that's expected, and then write an
       * assertion that only accepts that exact output.
       *
       * When the target isn't expected to throw an error, it's often best to assert
       * exactly that.
       *
       *     var goodFn = function () {};
       *
       *     expect(goodFn).to.not.throw(); // Recommended
       *     expect(goodFn).to.not.throw(ReferenceError, 'x'); // Not recommended
       *
       * When the target is expected to throw an error, it's often best to assert
       * that the error is of its expected type, and has a message that includes an
       * expected string, rather than asserting that it doesn't have one of many
       * unexpected types, and doesn't have a message that includes some string.
       *
       *     var badFn = function () { throw new TypeError('Illegal salmon!'); };
       *
       *     expect(badFn).to.throw(TypeError, 'salmon'); // Recommended
       *     expect(badFn).to.not.throw(ReferenceError, 'x'); // Not recommended
       *
       * `.throw` changes the target of any assertions that follow in the chain to
       * be the error object that's thrown.
       *
       *     var err = new TypeError('Illegal salmon!');
       *     err.code = 42;
       *     var badFn = function () { throw err; };
       *
       *     expect(badFn).to.throw(TypeError).with.property('code', 42);
       *
       * `.throw` accepts an optional `msg` argument which is a custom error message
       * to show when the assertion fails. The message can also be given as the
       * second argument to `expect`. When not providing two arguments, always use
       * the second form.
       *
       *     var goodFn = function () {};
       *
       *     expect(goodFn).to.throw(TypeError, 'x', 'nooo why fail??');
       *     expect(goodFn, 'nooo why fail??').to.throw();
       *
       * Due to limitations in ES5, `.throw` may not always work as expected when
       * using a transpiler such as Babel or TypeScript. In particular, it may
       * produce unexpected results when subclassing the built-in `Error` object and
       * then passing the subclassed constructor to `.throw`. See your transpiler's
       * docs for details:
       *
       * - ([Babel](https://babeljs.io/docs/usage/caveats/#classes))
       * - ([TypeScript](https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work))
       *
       * Beware of some common mistakes when using the `throw` assertion. One common
       * mistake is to accidentally invoke the function yourself instead of letting
       * the `throw` assertion invoke the function for you. For example, when
       * testing if a function named `fn` throws, provide `fn` instead of `fn()` as
       * the target for the assertion.
       *
       *     expect(fn).to.throw();     // Good! Tests `fn` as desired
       *     expect(fn()).to.throw();   // Bad! Tests result of `fn()`, not `fn`
       *
       * If you need to assert that your function `fn` throws when passed certain
       * arguments, then wrap a call to `fn` inside of another function.
       *
       *     expect(function () { fn(42); }).to.throw();  // Function expression
       *     expect(() => fn(42)).to.throw();             // ES6 arrow function
       *
       * Another common mistake is to provide an object method (or any stand-alone
       * function that relies on `this`) as the target of the assertion. Doing so is
       * problematic because the `this` context will be lost when the function is
       * invoked by `.throw`; there's no way for it to know what `this` is supposed
       * to be. There are two ways around this problem. One solution is to wrap the
       * method or function call inside of another function. Another solution is to
       * use `bind`.
       *
       *     expect(function () { cat.meow(); }).to.throw();  // Function expression
       *     expect(() => cat.meow()).to.throw();             // ES6 arrow function
       *     expect(cat.meow.bind(cat)).to.throw();           // Bind
       *
       * Finally, it's worth mentioning that it's a best practice in JavaScript to
       * only throw `Error` and derivatives of `Error` such as `ReferenceError`,
       * `TypeError`, and user-defined objects that extend `Error`. No other type of
       * value will generate a stack trace when initialized. With that said, the
       * `throw` assertion does technically support any type of value being thrown,
       * not just `Error` and its derivatives.
       *
       * The aliases `.throws` and `.Throw` can be used interchangeably with
       * `.throw`.
       *
       * @name throw
       * @alias throws
       * @alias Throw
       * @param {Error|ErrorConstructor} errorLike
       * @param {String|RegExp} errMsgMatcher error message
       * @param {String} msg _optional_
       * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error#Error_types
       * @returns error for chaining (null if no error)
       * @namespace BDD
       * @api public
       */

      function assertThrows (errorLike, errMsgMatcher, msg) {
        if (msg) flag(this, 'message', msg);
        var obj = flag(this, 'object')
          , ssfi = flag(this, 'ssfi')
          , flagMsg = flag(this, 'message')
          , negate = flag(this, 'negate') || false;
        new Assertion(obj, flagMsg, ssfi, true).is.a('function');

        if (errorLike instanceof RegExp || typeof errorLike === 'string') {
          errMsgMatcher = errorLike;
          errorLike = null;
        }

        var caughtErr;
        try {
          obj();
        } catch (err) {
          caughtErr = err;
        }

        // If we have the negate flag enabled and at least one valid argument it means we do expect an error
        // but we want it to match a given set of criteria
        var everyArgIsUndefined = errorLike === undefined && errMsgMatcher === undefined;

        // If we've got the negate flag enabled and both args, we should only fail if both aren't compatible
        // See Issue #551 and PR #683@GitHub
        var everyArgIsDefined = Boolean(errorLike && errMsgMatcher);
        var errorLikeFail = false;
        var errMsgMatcherFail = false;

        // Checking if error was thrown
        if (everyArgIsUndefined || !everyArgIsUndefined && !negate) {
          // We need this to display results correctly according to their types
          var errorLikeString = 'an error';
          if (errorLike instanceof Error) {
            errorLikeString = '#{exp}';
          } else if (errorLike) {
            errorLikeString = _.checkError.getConstructorName(errorLike);
          }

          this.assert(
              caughtErr
            , 'expected #{this} to throw ' + errorLikeString
            , 'expected #{this} to not throw an error but #{act} was thrown'
            , errorLike && errorLike.toString()
            , (caughtErr instanceof Error ?
                caughtErr.toString() : (typeof caughtErr === 'string' ? caughtErr : caughtErr &&
                                        _.checkError.getConstructorName(caughtErr)))
          );
        }

        if (errorLike && caughtErr) {
          // We should compare instances only if `errorLike` is an instance of `Error`
          if (errorLike instanceof Error) {
            var isCompatibleInstance = _.checkError.compatibleInstance(caughtErr, errorLike);

            if (isCompatibleInstance === negate) {
              // These checks were created to ensure we won't fail too soon when we've got both args and a negate
              // See Issue #551 and PR #683@GitHub
              if (everyArgIsDefined && negate) {
                errorLikeFail = true;
              } else {
                this.assert(
                    negate
                  , 'expected #{this} to throw #{exp} but #{act} was thrown'
                  , 'expected #{this} to not throw #{exp}' + (caughtErr && !negate ? ' but #{act} was thrown' : '')
                  , errorLike.toString()
                  , caughtErr.toString()
                );
              }
            }
          }

          var isCompatibleConstructor = _.checkError.compatibleConstructor(caughtErr, errorLike);
          if (isCompatibleConstructor === negate) {
            if (everyArgIsDefined && negate) {
                errorLikeFail = true;
            } else {
              this.assert(
                  negate
                , 'expected #{this} to throw #{exp} but #{act} was thrown'
                , 'expected #{this} to not throw #{exp}' + (caughtErr ? ' but #{act} was thrown' : '')
                , (errorLike instanceof Error ? errorLike.toString() : errorLike && _.checkError.getConstructorName(errorLike))
                , (caughtErr instanceof Error ? caughtErr.toString() : caughtErr && _.checkError.getConstructorName(caughtErr))
              );
            }
          }
        }

        if (caughtErr && errMsgMatcher !== undefined && errMsgMatcher !== null) {
          // Here we check compatible messages
          var placeholder = 'including';
          if (errMsgMatcher instanceof RegExp) {
            placeholder = 'matching';
          }

          var isCompatibleMessage = _.checkError.compatibleMessage(caughtErr, errMsgMatcher);
          if (isCompatibleMessage === negate) {
            if (everyArgIsDefined && negate) {
                errMsgMatcherFail = true;
            } else {
              this.assert(
                negate
                , 'expected #{this} to throw error ' + placeholder + ' #{exp} but got #{act}'
                , 'expected #{this} to throw error not ' + placeholder + ' #{exp}'
                ,  errMsgMatcher
                ,  _.checkError.getMessage(caughtErr)
              );
            }
          }
        }

        // If both assertions failed and both should've matched we throw an error
        if (errorLikeFail && errMsgMatcherFail) {
          this.assert(
            negate
            , 'expected #{this} to throw #{exp} but #{act} was thrown'
            , 'expected #{this} to not throw #{exp}' + (caughtErr ? ' but #{act} was thrown' : '')
            , (errorLike instanceof Error ? errorLike.toString() : errorLike && _.checkError.getConstructorName(errorLike))
            , (caughtErr instanceof Error ? caughtErr.toString() : caughtErr && _.checkError.getConstructorName(caughtErr))
          );
        }

        flag(this, 'object', caughtErr);
      }
      Assertion.addMethod('throw', assertThrows);
      Assertion.addMethod('throws', assertThrows);
      Assertion.addMethod('Throw', assertThrows);

      /**
       * ### .respondTo(method[, msg])
       *
       * When the target is a non-function object, `.respondTo` asserts that the
       * target has a method with the given name `method`. The method can be own or
       * inherited, and it can be enumerable or non-enumerable.
       *
       *     function Cat () {}
       *     Cat.prototype.meow = function () {};
       *
       *     expect(new Cat()).to.respondTo('meow');
       *
       * When the target is a function, `.respondTo` asserts that the target's
       * `prototype` property has a method with the given name `method`. Again, the
       * method can be own or inherited, and it can be enumerable or non-enumerable.
       *
       *     function Cat () {}
       *     Cat.prototype.meow = function () {};
       *
       *     expect(Cat).to.respondTo('meow');
       *
       * Add `.itself` earlier in the chain to force `.respondTo` to treat the
       * target as a non-function object, even if it's a function. Thus, it asserts
       * that the target has a method with the given name `method`, rather than
       * asserting that the target's `prototype` property has a method with the
       * given name `method`.
       *
       *     function Cat () {}
       *     Cat.prototype.meow = function () {};
       *     Cat.hiss = function () {};
       *
       *     expect(Cat).itself.to.respondTo('hiss').but.not.respondTo('meow');
       *
       * When not adding `.itself`, it's important to check the target's type before
       * using `.respondTo`. See the `.a` doc for info on checking a target's type.
       *
       *     function Cat () {}
       *     Cat.prototype.meow = function () {};
       *
       *     expect(new Cat()).to.be.an('object').that.respondsTo('meow');
       *
       * Add `.not` earlier in the chain to negate `.respondTo`.
       *
       *     function Dog () {}
       *     Dog.prototype.bark = function () {};
       *
       *     expect(new Dog()).to.not.respondTo('meow');
       *
       * `.respondTo` accepts an optional `msg` argument which is a custom error
       * message to show when the assertion fails. The message can also be given as
       * the second argument to `expect`.
       *
       *     expect({}).to.respondTo('meow', 'nooo why fail??');
       *     expect({}, 'nooo why fail??').to.respondTo('meow');
       *
       * The alias `.respondsTo` can be used interchangeably with `.respondTo`.
       *
       * @name respondTo
       * @alias respondsTo
       * @param {String} method
       * @param {String} msg _optional_
       * @namespace BDD
       * @api public
       */

      function respondTo (method, msg) {
        if (msg) flag(this, 'message', msg);
        var obj = flag(this, 'object')
          , itself = flag(this, 'itself')
          , context = ('function' === typeof obj && !itself)
            ? obj.prototype[method]
            : obj[method];

        this.assert(
            'function' === typeof context
          , 'expected #{this} to respond to ' + _.inspect(method)
          , 'expected #{this} to not respond to ' + _.inspect(method)
        );
      }

      Assertion.addMethod('respondTo', respondTo);
      Assertion.addMethod('respondsTo', respondTo);

      /**
       * ### .itself
       *
       * Forces all `.respondTo` assertions that follow in the chain to behave as if
       * the target is a non-function object, even if it's a function. Thus, it
       * causes `.respondTo` to assert that the target has a method with the given
       * name, rather than asserting that the target's `prototype` property has a
       * method with the given name.
       *
       *     function Cat () {}
       *     Cat.prototype.meow = function () {};
       *     Cat.hiss = function () {};
       *
       *     expect(Cat).itself.to.respondTo('hiss').but.not.respondTo('meow');
       *
       * @name itself
       * @namespace BDD
       * @api public
       */

      Assertion.addProperty('itself', function () {
        flag(this, 'itself', true);
      });

      /**
       * ### .satisfy(matcher[, msg])
       *
       * Invokes the given `matcher` function with the target being passed as the
       * first argument, and asserts that the value returned is truthy.
       *
       *     expect(1).to.satisfy(function(num) {
       *       return num > 0;
       *     });
       *
       * Add `.not` earlier in the chain to negate `.satisfy`.
       *
       *     expect(1).to.not.satisfy(function(num) {
       *       return num > 2;
       *     });
       *
       * `.satisfy` accepts an optional `msg` argument which is a custom error
       * message to show when the assertion fails. The message can also be given as
       * the second argument to `expect`.
       *
       *     expect(1).to.satisfy(function(num) {
       *       return num > 2;
       *     }, 'nooo why fail??');
       *
       *     expect(1, 'nooo why fail??').to.satisfy(function(num) {
       *       return num > 2;
       *     });
       *
       * The alias `.satisfies` can be used interchangeably with `.satisfy`.
       *
       * @name satisfy
       * @alias satisfies
       * @param {Function} matcher
       * @param {String} msg _optional_
       * @namespace BDD
       * @api public
       */

      function satisfy (matcher, msg) {
        if (msg) flag(this, 'message', msg);
        var obj = flag(this, 'object');
        var result = matcher(obj);
        this.assert(
            result
          , 'expected #{this} to satisfy ' + _.objDisplay(matcher)
          , 'expected #{this} to not satisfy' + _.objDisplay(matcher)
          , flag(this, 'negate') ? false : true
          , result
        );
      }

      Assertion.addMethod('satisfy', satisfy);
      Assertion.addMethod('satisfies', satisfy);

      /**
       * ### .closeTo(expected, delta[, msg])
       *
       * Asserts that the target is a number that's within a given +/- `delta` range
       * of the given number `expected`. However, it's often best to assert that the
       * target is equal to its expected value.
       *
       *     // Recommended
       *     expect(1.5).to.equal(1.5);
       *
       *     // Not recommended
       *     expect(1.5).to.be.closeTo(1, 0.5);
       *     expect(1.5).to.be.closeTo(2, 0.5);
       *     expect(1.5).to.be.closeTo(1, 1);
       *
       * Add `.not` earlier in the chain to negate `.closeTo`.
       *
       *     expect(1.5).to.equal(1.5); // Recommended
       *     expect(1.5).to.not.be.closeTo(3, 1); // Not recommended
       *
       * `.closeTo` accepts an optional `msg` argument which is a custom error
       * message to show when the assertion fails. The message can also be given as
       * the second argument to `expect`.
       *
       *     expect(1.5).to.be.closeTo(3, 1, 'nooo why fail??');
       *     expect(1.5, 'nooo why fail??').to.be.closeTo(3, 1);
       *
       * The alias `.approximately` can be used interchangeably with `.closeTo`.
       *
       * @name closeTo
       * @alias approximately
       * @param {Number} expected
       * @param {Number} delta
       * @param {String} msg _optional_
       * @namespace BDD
       * @api public
       */

      function closeTo(expected, delta, msg) {
        if (msg) flag(this, 'message', msg);
        var obj = flag(this, 'object')
          , flagMsg = flag(this, 'message')
          , ssfi = flag(this, 'ssfi');

        new Assertion(obj, flagMsg, ssfi, true).is.a('number');
        if (typeof expected !== 'number' || typeof delta !== 'number') {
          flagMsg = flagMsg ? flagMsg + ': ' : '';
          var deltaMessage = delta === undefined ? ", and a delta is required" : "";
          throw new AssertionError(
              flagMsg + 'the arguments to closeTo or approximately must be numbers' + deltaMessage,
              undefined,
              ssfi
          );
        }

        this.assert(
            Math.abs(obj - expected) <= delta
          , 'expected #{this} to be close to ' + expected + ' +/- ' + delta
          , 'expected #{this} not to be close to ' + expected + ' +/- ' + delta
        );
      }

      Assertion.addMethod('closeTo', closeTo);
      Assertion.addMethod('approximately', closeTo);

      // Note: Duplicates are ignored if testing for inclusion instead of sameness.
      function isSubsetOf(subset, superset, cmp, contains, ordered) {
        if (!contains) {
          if (subset.length !== superset.length) return false;
          superset = superset.slice();
        }

        return subset.every(function(elem, idx) {
          if (ordered) return cmp ? cmp(elem, superset[idx]) : elem === superset[idx];

          if (!cmp) {
            var matchIdx = superset.indexOf(elem);
            if (matchIdx === -1) return false;

            // Remove match from superset so not counted twice if duplicate in subset.
            if (!contains) superset.splice(matchIdx, 1);
            return true;
          }

          return superset.some(function(elem2, matchIdx) {
            if (!cmp(elem, elem2)) return false;

            // Remove match from superset so not counted twice if duplicate in subset.
            if (!contains) superset.splice(matchIdx, 1);
            return true;
          });
        });
      }

      /**
       * ### .members(set[, msg])
       *
       * Asserts that the target array has the same members as the given array
       * `set`.
       *
       *     expect([1, 2, 3]).to.have.members([2, 1, 3]);
       *     expect([1, 2, 2]).to.have.members([2, 1, 2]);
       *
       * By default, members are compared using strict (`===`) equality. Add `.deep`
       * earlier in the chain to use deep equality instead. See the `deep-eql`
       * project page for info on the deep equality algorithm:
       * https://github.com/chaijs/deep-eql.
       *
       *     // Target array deeply (but not strictly) has member `{a: 1}`
       *     expect([{a: 1}]).to.have.deep.members([{a: 1}]);
       *     expect([{a: 1}]).to.not.have.members([{a: 1}]);
       *
       * By default, order doesn't matter. Add `.ordered` earlier in the chain to
       * require that members appear in the same order.
       *
       *     expect([1, 2, 3]).to.have.ordered.members([1, 2, 3]);
       *     expect([1, 2, 3]).to.have.members([2, 1, 3])
       *       .but.not.ordered.members([2, 1, 3]);
       *
       * By default, both arrays must be the same size. Add `.include` earlier in
       * the chain to require that the target's members be a superset of the
       * expected members. Note that duplicates are ignored in the subset when
       * `.include` is added.
       *
       *     // Target array is a superset of [1, 2] but not identical
       *     expect([1, 2, 3]).to.include.members([1, 2]);
       *     expect([1, 2, 3]).to.not.have.members([1, 2]);
       *
       *     // Duplicates in the subset are ignored
       *     expect([1, 2, 3]).to.include.members([1, 2, 2, 2]);
       *
       * `.deep`, `.ordered`, and `.include` can all be combined. However, if
       * `.include` and `.ordered` are combined, the ordering begins at the start of
       * both arrays.
       *
       *     expect([{a: 1}, {b: 2}, {c: 3}])
       *       .to.include.deep.ordered.members([{a: 1}, {b: 2}])
       *       .but.not.include.deep.ordered.members([{b: 2}, {c: 3}]);
       *
       * Add `.not` earlier in the chain to negate `.members`. However, it's
       * dangerous to do so. The problem is that it creates uncertain expectations
       * by asserting that the target array doesn't have all of the same members as
       * the given array `set` but may or may not have some of them. It's often best
       * to identify the exact output that's expected, and then write an assertion
       * that only accepts that exact output.
       *
       *     expect([1, 2]).to.not.include(3).and.not.include(4); // Recommended
       *     expect([1, 2]).to.not.have.members([3, 4]); // Not recommended
       *
       * `.members` accepts an optional `msg` argument which is a custom error
       * message to show when the assertion fails. The message can also be given as
       * the second argument to `expect`.
       *
       *     expect([1, 2]).to.have.members([1, 2, 3], 'nooo why fail??');
       *     expect([1, 2], 'nooo why fail??').to.have.members([1, 2, 3]);
       *
       * @name members
       * @param {Array} set
       * @param {String} msg _optional_
       * @namespace BDD
       * @api public
       */

      Assertion.addMethod('members', function (subset, msg) {
        if (msg) flag(this, 'message', msg);
        var obj = flag(this, 'object')
          , flagMsg = flag(this, 'message')
          , ssfi = flag(this, 'ssfi');

        new Assertion(obj, flagMsg, ssfi, true).to.be.an('array');
        new Assertion(subset, flagMsg, ssfi, true).to.be.an('array');

        var contains = flag(this, 'contains');
        var ordered = flag(this, 'ordered');

        var subject, failMsg, failNegateMsg;

        if (contains) {
          subject = ordered ? 'an ordered superset' : 'a superset';
          failMsg = 'expected #{this} to be ' + subject + ' of #{exp}';
          failNegateMsg = 'expected #{this} to not be ' + subject + ' of #{exp}';
        } else {
          subject = ordered ? 'ordered members' : 'members';
          failMsg = 'expected #{this} to have the same ' + subject + ' as #{exp}';
          failNegateMsg = 'expected #{this} to not have the same ' + subject + ' as #{exp}';
        }

        var cmp = flag(this, 'deep') ? _.eql : undefined;

        this.assert(
            isSubsetOf(subset, obj, cmp, contains, ordered)
          , failMsg
          , failNegateMsg
          , subset
          , obj
          , true
        );
      });

      /**
       * ### .oneOf(list[, msg])
       *
       * Asserts that the target is a member of the given array `list`. However,
       * it's often best to assert that the target is equal to its expected value.
       *
       *     expect(1).to.equal(1); // Recommended
       *     expect(1).to.be.oneOf([1, 2, 3]); // Not recommended
       *
       * Comparisons are performed using strict (`===`) equality.
       *
       * Add `.not` earlier in the chain to negate `.oneOf`.
       *
       *     expect(1).to.equal(1); // Recommended
       *     expect(1).to.not.be.oneOf([2, 3, 4]); // Not recommended
       *
       * It can also be chained with `.contain` or `.include`, which will work with
       * both arrays and strings:
       *
       *     expect('Today is sunny').to.contain.oneOf(['sunny', 'cloudy'])
       *     expect('Today is rainy').to.not.contain.oneOf(['sunny', 'cloudy'])
       *     expect([1,2,3]).to.contain.oneOf([3,4,5])
       *     expect([1,2,3]).to.not.contain.oneOf([4,5,6])
       *
       * `.oneOf` accepts an optional `msg` argument which is a custom error message
       * to show when the assertion fails. The message can also be given as the
       * second argument to `expect`.
       *
       *     expect(1).to.be.oneOf([2, 3, 4], 'nooo why fail??');
       *     expect(1, 'nooo why fail??').to.be.oneOf([2, 3, 4]);
       *
       * @name oneOf
       * @param {Array<*>} list
       * @param {String} msg _optional_
       * @namespace BDD
       * @api public
       */

      function oneOf (list, msg) {
        if (msg) flag(this, 'message', msg);
        var expected = flag(this, 'object')
          , flagMsg = flag(this, 'message')
          , ssfi = flag(this, 'ssfi')
          , contains = flag(this, 'contains')
          , isDeep = flag(this, 'deep');
        new Assertion(list, flagMsg, ssfi, true).to.be.an('array');

        if (contains) {
          this.assert(
            list.some(function(possibility) { return expected.indexOf(possibility) > -1 })
            , 'expected #{this} to contain one of #{exp}'
            , 'expected #{this} to not contain one of #{exp}'
            , list
            , expected
          );
        } else {
          if (isDeep) {
            this.assert(
              list.some(function(possibility) { return _.eql(expected, possibility) })
              , 'expected #{this} to deeply equal one of #{exp}'
              , 'expected #{this} to deeply equal one of #{exp}'
              , list
              , expected
            );
          } else {
            this.assert(
              list.indexOf(expected) > -1
              , 'expected #{this} to be one of #{exp}'
              , 'expected #{this} to not be one of #{exp}'
              , list
              , expected
            );
          }
        }
      }

      Assertion.addMethod('oneOf', oneOf);

      /**
       * ### .change(subject[, prop[, msg]])
       *
       * When one argument is provided, `.change` asserts that the given function
       * `subject` returns a different value when it's invoked before the target
       * function compared to when it's invoked afterward. However, it's often best
       * to assert that `subject` is equal to its expected value.
       *
       *     var dots = ''
       *       , addDot = function () { dots += '.'; }
       *       , getDots = function () { return dots; };
       *
       *     // Recommended
       *     expect(getDots()).to.equal('');
       *     addDot();
       *     expect(getDots()).to.equal('.');
       *
       *     // Not recommended
       *     expect(addDot).to.change(getDots);
       *
       * When two arguments are provided, `.change` asserts that the value of the
       * given object `subject`'s `prop` property is different before invoking the
       * target function compared to afterward.
       *
       *     var myObj = {dots: ''}
       *       , addDot = function () { myObj.dots += '.'; };
       *
       *     // Recommended
       *     expect(myObj).to.have.property('dots', '');
       *     addDot();
       *     expect(myObj).to.have.property('dots', '.');
       *
       *     // Not recommended
       *     expect(addDot).to.change(myObj, 'dots');
       *
       * Strict (`===`) equality is used to compare before and after values.
       *
       * Add `.not` earlier in the chain to negate `.change`.
       *
       *     var dots = ''
       *       , noop = function () {}
       *       , getDots = function () { return dots; };
       *
       *     expect(noop).to.not.change(getDots);
       *
       *     var myObj = {dots: ''}
       *       , noop = function () {};
       *
       *     expect(noop).to.not.change(myObj, 'dots');
       *
       * `.change` accepts an optional `msg` argument which is a custom error
       * message to show when the assertion fails. The message can also be given as
       * the second argument to `expect`. When not providing two arguments, always
       * use the second form.
       *
       *     var myObj = {dots: ''}
       *       , addDot = function () { myObj.dots += '.'; };
       *
       *     expect(addDot).to.not.change(myObj, 'dots', 'nooo why fail??');
       *
       *     var dots = ''
       *       , addDot = function () { dots += '.'; }
       *       , getDots = function () { return dots; };
       *
       *     expect(addDot, 'nooo why fail??').to.not.change(getDots);
       *
       * `.change` also causes all `.by` assertions that follow in the chain to
       * assert how much a numeric subject was increased or decreased by. However,
       * it's dangerous to use `.change.by`. The problem is that it creates
       * uncertain expectations by asserting that the subject either increases by
       * the given delta, or that it decreases by the given delta. It's often best
       * to identify the exact output that's expected, and then write an assertion
       * that only accepts that exact output.
       *
       *     var myObj = {val: 1}
       *       , addTwo = function () { myObj.val += 2; }
       *       , subtractTwo = function () { myObj.val -= 2; };
       *
       *     expect(addTwo).to.increase(myObj, 'val').by(2); // Recommended
       *     expect(addTwo).to.change(myObj, 'val').by(2); // Not recommended
       *
       *     expect(subtractTwo).to.decrease(myObj, 'val').by(2); // Recommended
       *     expect(subtractTwo).to.change(myObj, 'val').by(2); // Not recommended
       *
       * The alias `.changes` can be used interchangeably with `.change`.
       *
       * @name change
       * @alias changes
       * @param {String} subject
       * @param {String} prop name _optional_
       * @param {String} msg _optional_
       * @namespace BDD
       * @api public
       */

      function assertChanges (subject, prop, msg) {
        if (msg) flag(this, 'message', msg);
        var fn = flag(this, 'object')
          , flagMsg = flag(this, 'message')
          , ssfi = flag(this, 'ssfi');
        new Assertion(fn, flagMsg, ssfi, true).is.a('function');

        var initial;
        if (!prop) {
          new Assertion(subject, flagMsg, ssfi, true).is.a('function');
          initial = subject();
        } else {
          new Assertion(subject, flagMsg, ssfi, true).to.have.property(prop);
          initial = subject[prop];
        }

        fn();

        var final = prop === undefined || prop === null ? subject() : subject[prop];
        var msgObj = prop === undefined || prop === null ? initial : '.' + prop;

        // This gets flagged because of the .by(delta) assertion
        flag(this, 'deltaMsgObj', msgObj);
        flag(this, 'initialDeltaValue', initial);
        flag(this, 'finalDeltaValue', final);
        flag(this, 'deltaBehavior', 'change');
        flag(this, 'realDelta', final !== initial);

        this.assert(
          initial !== final
          , 'expected ' + msgObj + ' to change'
          , 'expected ' + msgObj + ' to not change'
        );
      }

      Assertion.addMethod('change', assertChanges);
      Assertion.addMethod('changes', assertChanges);

      /**
       * ### .increase(subject[, prop[, msg]])
       *
       * When one argument is provided, `.increase` asserts that the given function
       * `subject` returns a greater number when it's invoked after invoking the
       * target function compared to when it's invoked beforehand. `.increase` also
       * causes all `.by` assertions that follow in the chain to assert how much
       * greater of a number is returned. It's often best to assert that the return
       * value increased by the expected amount, rather than asserting it increased
       * by any amount.
       *
       *     var val = 1
       *       , addTwo = function () { val += 2; }
       *       , getVal = function () { return val; };
       *
       *     expect(addTwo).to.increase(getVal).by(2); // Recommended
       *     expect(addTwo).to.increase(getVal); // Not recommended
       *
       * When two arguments are provided, `.increase` asserts that the value of the
       * given object `subject`'s `prop` property is greater after invoking the
       * target function compared to beforehand.
       *
       *     var myObj = {val: 1}
       *       , addTwo = function () { myObj.val += 2; };
       *
       *     expect(addTwo).to.increase(myObj, 'val').by(2); // Recommended
       *     expect(addTwo).to.increase(myObj, 'val'); // Not recommended
       *
       * Add `.not` earlier in the chain to negate `.increase`. However, it's
       * dangerous to do so. The problem is that it creates uncertain expectations
       * by asserting that the subject either decreases, or that it stays the same.
       * It's often best to identify the exact output that's expected, and then
       * write an assertion that only accepts that exact output.
       *
       * When the subject is expected to decrease, it's often best to assert that it
       * decreased by the expected amount.
       *
       *     var myObj = {val: 1}
       *       , subtractTwo = function () { myObj.val -= 2; };
       *
       *     expect(subtractTwo).to.decrease(myObj, 'val').by(2); // Recommended
       *     expect(subtractTwo).to.not.increase(myObj, 'val'); // Not recommended
       *
       * When the subject is expected to stay the same, it's often best to assert
       * exactly that.
       *
       *     var myObj = {val: 1}
       *       , noop = function () {};
       *
       *     expect(noop).to.not.change(myObj, 'val'); // Recommended
       *     expect(noop).to.not.increase(myObj, 'val'); // Not recommended
       *
       * `.increase` accepts an optional `msg` argument which is a custom error
       * message to show when the assertion fails. The message can also be given as
       * the second argument to `expect`. When not providing two arguments, always
       * use the second form.
       *
       *     var myObj = {val: 1}
       *       , noop = function () {};
       *
       *     expect(noop).to.increase(myObj, 'val', 'nooo why fail??');
       *
       *     var val = 1
       *       , noop = function () {}
       *       , getVal = function () { return val; };
       *
       *     expect(noop, 'nooo why fail??').to.increase(getVal);
       *
       * The alias `.increases` can be used interchangeably with `.increase`.
       *
       * @name increase
       * @alias increases
       * @param {String|Function} subject
       * @param {String} prop name _optional_
       * @param {String} msg _optional_
       * @namespace BDD
       * @api public
       */

      function assertIncreases (subject, prop, msg) {
        if (msg) flag(this, 'message', msg);
        var fn = flag(this, 'object')
          , flagMsg = flag(this, 'message')
          , ssfi = flag(this, 'ssfi');
        new Assertion(fn, flagMsg, ssfi, true).is.a('function');

        var initial;
        if (!prop) {
          new Assertion(subject, flagMsg, ssfi, true).is.a('function');
          initial = subject();
        } else {
          new Assertion(subject, flagMsg, ssfi, true).to.have.property(prop);
          initial = subject[prop];
        }

        // Make sure that the target is a number
        new Assertion(initial, flagMsg, ssfi, true).is.a('number');

        fn();

        var final = prop === undefined || prop === null ? subject() : subject[prop];
        var msgObj = prop === undefined || prop === null ? initial : '.' + prop;

        flag(this, 'deltaMsgObj', msgObj);
        flag(this, 'initialDeltaValue', initial);
        flag(this, 'finalDeltaValue', final);
        flag(this, 'deltaBehavior', 'increase');
        flag(this, 'realDelta', final - initial);

        this.assert(
          final - initial > 0
          , 'expected ' + msgObj + ' to increase'
          , 'expected ' + msgObj + ' to not increase'
        );
      }

      Assertion.addMethod('increase', assertIncreases);
      Assertion.addMethod('increases', assertIncreases);

      /**
       * ### .decrease(subject[, prop[, msg]])
       *
       * When one argument is provided, `.decrease` asserts that the given function
       * `subject` returns a lesser number when it's invoked after invoking the
       * target function compared to when it's invoked beforehand. `.decrease` also
       * causes all `.by` assertions that follow in the chain to assert how much
       * lesser of a number is returned. It's often best to assert that the return
       * value decreased by the expected amount, rather than asserting it decreased
       * by any amount.
       *
       *     var val = 1
       *       , subtractTwo = function () { val -= 2; }
       *       , getVal = function () { return val; };
       *
       *     expect(subtractTwo).to.decrease(getVal).by(2); // Recommended
       *     expect(subtractTwo).to.decrease(getVal); // Not recommended
       *
       * When two arguments are provided, `.decrease` asserts that the value of the
       * given object `subject`'s `prop` property is lesser after invoking the
       * target function compared to beforehand.
       *
       *     var myObj = {val: 1}
       *       , subtractTwo = function () { myObj.val -= 2; };
       *
       *     expect(subtractTwo).to.decrease(myObj, 'val').by(2); // Recommended
       *     expect(subtractTwo).to.decrease(myObj, 'val'); // Not recommended
       *
       * Add `.not` earlier in the chain to negate `.decrease`. However, it's
       * dangerous to do so. The problem is that it creates uncertain expectations
       * by asserting that the subject either increases, or that it stays the same.
       * It's often best to identify the exact output that's expected, and then
       * write an assertion that only accepts that exact output.
       *
       * When the subject is expected to increase, it's often best to assert that it
       * increased by the expected amount.
       *
       *     var myObj = {val: 1}
       *       , addTwo = function () { myObj.val += 2; };
       *
       *     expect(addTwo).to.increase(myObj, 'val').by(2); // Recommended
       *     expect(addTwo).to.not.decrease(myObj, 'val'); // Not recommended
       *
       * When the subject is expected to stay the same, it's often best to assert
       * exactly that.
       *
       *     var myObj = {val: 1}
       *       , noop = function () {};
       *
       *     expect(noop).to.not.change(myObj, 'val'); // Recommended
       *     expect(noop).to.not.decrease(myObj, 'val'); // Not recommended
       *
       * `.decrease` accepts an optional `msg` argument which is a custom error
       * message to show when the assertion fails. The message can also be given as
       * the second argument to `expect`. When not providing two arguments, always
       * use the second form.
       *
       *     var myObj = {val: 1}
       *       , noop = function () {};
       *
       *     expect(noop).to.decrease(myObj, 'val', 'nooo why fail??');
       *
       *     var val = 1
       *       , noop = function () {}
       *       , getVal = function () { return val; };
       *
       *     expect(noop, 'nooo why fail??').to.decrease(getVal);
       *
       * The alias `.decreases` can be used interchangeably with `.decrease`.
       *
       * @name decrease
       * @alias decreases
       * @param {String|Function} subject
       * @param {String} prop name _optional_
       * @param {String} msg _optional_
       * @namespace BDD
       * @api public
       */

      function assertDecreases (subject, prop, msg) {
        if (msg) flag(this, 'message', msg);
        var fn = flag(this, 'object')
          , flagMsg = flag(this, 'message')
          , ssfi = flag(this, 'ssfi');
        new Assertion(fn, flagMsg, ssfi, true).is.a('function');

        var initial;
        if (!prop) {
          new Assertion(subject, flagMsg, ssfi, true).is.a('function');
          initial = subject();
        } else {
          new Assertion(subject, flagMsg, ssfi, true).to.have.property(prop);
          initial = subject[prop];
        }

        // Make sure that the target is a number
        new Assertion(initial, flagMsg, ssfi, true).is.a('number');

        fn();

        var final = prop === undefined || prop === null ? subject() : subject[prop];
        var msgObj = prop === undefined || prop === null ? initial : '.' + prop;

        flag(this, 'deltaMsgObj', msgObj);
        flag(this, 'initialDeltaValue', initial);
        flag(this, 'finalDeltaValue', final);
        flag(this, 'deltaBehavior', 'decrease');
        flag(this, 'realDelta', initial - final);

        this.assert(
          final - initial < 0
          , 'expected ' + msgObj + ' to decrease'
          , 'expected ' + msgObj + ' to not decrease'
        );
      }

      Assertion.addMethod('decrease', assertDecreases);
      Assertion.addMethod('decreases', assertDecreases);

      /**
       * ### .by(delta[, msg])
       *
       * When following an `.increase` assertion in the chain, `.by` asserts that
       * the subject of the `.increase` assertion increased by the given `delta`.
       *
       *     var myObj = {val: 1}
       *       , addTwo = function () { myObj.val += 2; };
       *
       *     expect(addTwo).to.increase(myObj, 'val').by(2);
       *
       * When following a `.decrease` assertion in the chain, `.by` asserts that the
       * subject of the `.decrease` assertion decreased by the given `delta`.
       *
       *     var myObj = {val: 1}
       *       , subtractTwo = function () { myObj.val -= 2; };
       *
       *     expect(subtractTwo).to.decrease(myObj, 'val').by(2);
       *
       * When following a `.change` assertion in the chain, `.by` asserts that the
       * subject of the `.change` assertion either increased or decreased by the
       * given `delta`. However, it's dangerous to use `.change.by`. The problem is
       * that it creates uncertain expectations. It's often best to identify the
       * exact output that's expected, and then write an assertion that only accepts
       * that exact output.
       *
       *     var myObj = {val: 1}
       *       , addTwo = function () { myObj.val += 2; }
       *       , subtractTwo = function () { myObj.val -= 2; };
       *
       *     expect(addTwo).to.increase(myObj, 'val').by(2); // Recommended
       *     expect(addTwo).to.change(myObj, 'val').by(2); // Not recommended
       *
       *     expect(subtractTwo).to.decrease(myObj, 'val').by(2); // Recommended
       *     expect(subtractTwo).to.change(myObj, 'val').by(2); // Not recommended
       *
       * Add `.not` earlier in the chain to negate `.by`. However, it's often best
       * to assert that the subject changed by its expected delta, rather than
       * asserting that it didn't change by one of countless unexpected deltas.
       *
       *     var myObj = {val: 1}
       *       , addTwo = function () { myObj.val += 2; };
       *
       *     // Recommended
       *     expect(addTwo).to.increase(myObj, 'val').by(2);
       *
       *     // Not recommended
       *     expect(addTwo).to.increase(myObj, 'val').but.not.by(3);
       *
       * `.by` accepts an optional `msg` argument which is a custom error message to
       * show when the assertion fails. The message can also be given as the second
       * argument to `expect`.
       *
       *     var myObj = {val: 1}
       *       , addTwo = function () { myObj.val += 2; };
       *
       *     expect(addTwo).to.increase(myObj, 'val').by(3, 'nooo why fail??');
       *     expect(addTwo, 'nooo why fail??').to.increase(myObj, 'val').by(3);
       *
       * @name by
       * @param {Number} delta
       * @param {String} msg _optional_
       * @namespace BDD
       * @api public
       */

      function assertDelta(delta, msg) {
        if (msg) flag(this, 'message', msg);

        var msgObj = flag(this, 'deltaMsgObj');
        var initial = flag(this, 'initialDeltaValue');
        var final = flag(this, 'finalDeltaValue');
        var behavior = flag(this, 'deltaBehavior');
        var realDelta = flag(this, 'realDelta');

        var expression;
        if (behavior === 'change') {
          expression = Math.abs(final - initial) === Math.abs(delta);
        } else {
          expression = realDelta === Math.abs(delta);
        }

        this.assert(
          expression
          , 'expected ' + msgObj + ' to ' + behavior + ' by ' + delta
          , 'expected ' + msgObj + ' to not ' + behavior + ' by ' + delta
        );
      }

      Assertion.addMethod('by', assertDelta);

      /**
       * ### .extensible
       *
       * Asserts that the target is extensible, which means that new properties can
       * be added to it. Primitives are never extensible.
       *
       *     expect({a: 1}).to.be.extensible;
       *
       * Add `.not` earlier in the chain to negate `.extensible`.
       *
       *     var nonExtensibleObject = Object.preventExtensions({})
       *       , sealedObject = Object.seal({})
       *       , frozenObject = Object.freeze({});
       *
       *     expect(nonExtensibleObject).to.not.be.extensible;
       *     expect(sealedObject).to.not.be.extensible;
       *     expect(frozenObject).to.not.be.extensible;
       *     expect(1).to.not.be.extensible;
       *
       * A custom error message can be given as the second argument to `expect`.
       *
       *     expect(1, 'nooo why fail??').to.be.extensible;
       *
       * @name extensible
       * @namespace BDD
       * @api public
       */

      Assertion.addProperty('extensible', function() {
        var obj = flag(this, 'object');

        // In ES5, if the argument to this method is a primitive, then it will cause a TypeError.
        // In ES6, a non-object argument will be treated as if it was a non-extensible ordinary object, simply return false.
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/isExtensible
        // The following provides ES6 behavior for ES5 environments.

        var isExtensible = obj === Object(obj) && Object.isExtensible(obj);

        this.assert(
          isExtensible
          , 'expected #{this} to be extensible'
          , 'expected #{this} to not be extensible'
        );
      });

      /**
       * ### .sealed
       *
       * Asserts that the target is sealed, which means that new properties can't be
       * added to it, and its existing properties can't be reconfigured or deleted.
       * However, it's possible that its existing properties can still be reassigned
       * to different values. Primitives are always sealed.
       *
       *     var sealedObject = Object.seal({});
       *     var frozenObject = Object.freeze({});
       *
       *     expect(sealedObject).to.be.sealed;
       *     expect(frozenObject).to.be.sealed;
       *     expect(1).to.be.sealed;
       *
       * Add `.not` earlier in the chain to negate `.sealed`.
       *
       *     expect({a: 1}).to.not.be.sealed;
       *
       * A custom error message can be given as the second argument to `expect`.
       *
       *     expect({a: 1}, 'nooo why fail??').to.be.sealed;
       *
       * @name sealed
       * @namespace BDD
       * @api public
       */

      Assertion.addProperty('sealed', function() {
        var obj = flag(this, 'object');

        // In ES5, if the argument to this method is a primitive, then it will cause a TypeError.
        // In ES6, a non-object argument will be treated as if it was a sealed ordinary object, simply return true.
        // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/isSealed
        // The following provides ES6 behavior for ES5 environments.

        var isSealed = obj === Object(obj) ? Object.isSealed(obj) : true;

        this.assert(
          isSealed
          , 'expected #{this} to be sealed'
          , 'expected #{this} to not be sealed'
        );
      });

      /**
       * ### .frozen
       *
       * Asserts that the target is frozen, which means that new properties can't be
       * added to it, and its existing properties can't be reassigned to different
       * values, reconfigured, or deleted. Primitives are always frozen.
       *
       *     var frozenObject = Object.freeze({});
       *
       *     expect(frozenObject).to.be.frozen;
       *     expect(1).to.be.frozen;
       *
       * Add `.not` earlier in the chain to negate `.frozen`.
       *
       *     expect({a: 1}).to.not.be.frozen;
       *
       * A custom error message can be given as the second argument to `expect`.
       *
       *     expect({a: 1}, 'nooo why fail??').to.be.frozen;
       *
       * @name frozen
       * @namespace BDD
       * @api public
       */

      Assertion.addProperty('frozen', function() {
        var obj = flag(this, 'object');

        // In ES5, if the argument to this method is a primitive, then it will cause a TypeError.
        // In ES6, a non-object argument will be treated as if it was a frozen ordinary object, simply return true.
        // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/isFrozen
        // The following provides ES6 behavior for ES5 environments.

        var isFrozen = obj === Object(obj) ? Object.isFrozen(obj) : true;

        this.assert(
          isFrozen
          , 'expected #{this} to be frozen'
          , 'expected #{this} to not be frozen'
        );
      });

      /**
       * ### .finite
       *
       * Asserts that the target is a number, and isn't `NaN` or positive/negative
       * `Infinity`.
       *
       *     expect(1).to.be.finite;
       *
       * Add `.not` earlier in the chain to negate `.finite`. However, it's
       * dangerous to do so. The problem is that it creates uncertain expectations
       * by asserting that the subject either isn't a number, or that it's `NaN`, or
       * that it's positive `Infinity`, or that it's negative `Infinity`. It's often
       * best to identify the exact output that's expected, and then write an
       * assertion that only accepts that exact output.
       *
       * When the target isn't expected to be a number, it's often best to assert
       * that it's the expected type, rather than asserting that it isn't one of
       * many unexpected types.
       *
       *     expect('foo').to.be.a('string'); // Recommended
       *     expect('foo').to.not.be.finite; // Not recommended
       *
       * When the target is expected to be `NaN`, it's often best to assert exactly
       * that.
       *
       *     expect(NaN).to.be.NaN; // Recommended
       *     expect(NaN).to.not.be.finite; // Not recommended
       *
       * When the target is expected to be positive infinity, it's often best to
       * assert exactly that.
       *
       *     expect(Infinity).to.equal(Infinity); // Recommended
       *     expect(Infinity).to.not.be.finite; // Not recommended
       *
       * When the target is expected to be negative infinity, it's often best to
       * assert exactly that.
       *
       *     expect(-Infinity).to.equal(-Infinity); // Recommended
       *     expect(-Infinity).to.not.be.finite; // Not recommended
       *
       * A custom error message can be given as the second argument to `expect`.
       *
       *     expect('foo', 'nooo why fail??').to.be.finite;
       *
       * @name finite
       * @namespace BDD
       * @api public
       */

      Assertion.addProperty('finite', function(msg) {
        var obj = flag(this, 'object');

        this.assert(
            typeof obj === 'number' && isFinite(obj)
          , 'expected #{this} to be a finite number'
          , 'expected #{this} to not be a finite number'
        );
      });
    };

    /*!
     * chai
     * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
     * MIT Licensed
     */

    var expect$1 = function (chai, util) {
      chai.expect = function (val, message) {
        return new chai.Assertion(val, message);
      };

      /**
       * ### .fail([message])
       * ### .fail(actual, expected, [message], [operator])
       *
       * Throw a failure.
       *
       *     expect.fail();
       *     expect.fail("custom error message");
       *     expect.fail(1, 2);
       *     expect.fail(1, 2, "custom error message");
       *     expect.fail(1, 2, "custom error message", ">");
       *     expect.fail(1, 2, undefined, ">");
       *
       * @name fail
       * @param {Mixed} actual
       * @param {Mixed} expected
       * @param {String} message
       * @param {String} operator
       * @namespace BDD
       * @api public
       */

      chai.expect.fail = function (actual, expected, message, operator) {
        if (arguments.length < 2) {
            message = actual;
            actual = undefined;
        }

        message = message || 'expect.fail()';
        throw new chai.AssertionError(message, {
            actual: actual
          , expected: expected
          , operator: operator
        }, chai.expect.fail);
      };
    };

    /*!
     * chai
     * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
     * MIT Licensed
     */

    var should = function (chai, util) {
      var Assertion = chai.Assertion;

      function loadShould () {
        // explicitly define this method as function as to have it's name to include as `ssfi`
        function shouldGetter() {
          if (this instanceof String
              || this instanceof Number
              || this instanceof Boolean
              || typeof Symbol === 'function' && this instanceof Symbol
              || typeof BigInt === 'function' && this instanceof BigInt) {
            return new Assertion(this.valueOf(), null, shouldGetter);
          }
          return new Assertion(this, null, shouldGetter);
        }
        function shouldSetter(value) {
          // See https://github.com/chaijs/chai/issues/86: this makes
          // `whatever.should = someValue` actually set `someValue`, which is
          // especially useful for `global.should = require('chai').should()`.
          //
          // Note that we have to use [[DefineProperty]] instead of [[Put]]
          // since otherwise we would trigger this very setter!
          Object.defineProperty(this, 'should', {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
          });
        }
        // modify Object.prototype to have `should`
        Object.defineProperty(Object.prototype, 'should', {
          set: shouldSetter
          , get: shouldGetter
          , configurable: true
        });

        var should = {};

        /**
         * ### .fail([message])
         * ### .fail(actual, expected, [message], [operator])
         *
         * Throw a failure.
         *
         *     should.fail();
         *     should.fail("custom error message");
         *     should.fail(1, 2);
         *     should.fail(1, 2, "custom error message");
         *     should.fail(1, 2, "custom error message", ">");
         *     should.fail(1, 2, undefined, ">");
         *
         *
         * @name fail
         * @param {Mixed} actual
         * @param {Mixed} expected
         * @param {String} message
         * @param {String} operator
         * @namespace BDD
         * @api public
         */

        should.fail = function (actual, expected, message, operator) {
          if (arguments.length < 2) {
              message = actual;
              actual = undefined;
          }

          message = message || 'should.fail()';
          throw new chai.AssertionError(message, {
              actual: actual
            , expected: expected
            , operator: operator
          }, should.fail);
        };

        /**
         * ### .equal(actual, expected, [message])
         *
         * Asserts non-strict equality (`==`) of `actual` and `expected`.
         *
         *     should.equal(3, '3', '== coerces values to strings');
         *
         * @name equal
         * @param {Mixed} actual
         * @param {Mixed} expected
         * @param {String} message
         * @namespace Should
         * @api public
         */

        should.equal = function (val1, val2, msg) {
          new Assertion(val1, msg).to.equal(val2);
        };

        /**
         * ### .throw(function, [constructor/string/regexp], [string/regexp], [message])
         *
         * Asserts that `function` will throw an error that is an instance of
         * `constructor`, or alternately that it will throw an error with message
         * matching `regexp`.
         *
         *     should.throw(fn, 'function throws a reference error');
         *     should.throw(fn, /function throws a reference error/);
         *     should.throw(fn, ReferenceError);
         *     should.throw(fn, ReferenceError, 'function throws a reference error');
         *     should.throw(fn, ReferenceError, /function throws a reference error/);
         *
         * @name throw
         * @alias Throw
         * @param {Function} function
         * @param {ErrorConstructor} constructor
         * @param {RegExp} regexp
         * @param {String} message
         * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error#Error_types
         * @namespace Should
         * @api public
         */

        should.Throw = function (fn, errt, errs, msg) {
          new Assertion(fn, msg).to.Throw(errt, errs);
        };

        /**
         * ### .exist
         *
         * Asserts that the target is neither `null` nor `undefined`.
         *
         *     var foo = 'hi';
         *
         *     should.exist(foo, 'foo exists');
         *
         * @name exist
         * @namespace Should
         * @api public
         */

        should.exist = function (val, msg) {
          new Assertion(val, msg).to.exist;
        };

        // negation
        should.not = {};

        /**
         * ### .not.equal(actual, expected, [message])
         *
         * Asserts non-strict inequality (`!=`) of `actual` and `expected`.
         *
         *     should.not.equal(3, 4, 'these numbers are not equal');
         *
         * @name not.equal
         * @param {Mixed} actual
         * @param {Mixed} expected
         * @param {String} message
         * @namespace Should
         * @api public
         */

        should.not.equal = function (val1, val2, msg) {
          new Assertion(val1, msg).to.not.equal(val2);
        };

        /**
         * ### .throw(function, [constructor/regexp], [message])
         *
         * Asserts that `function` will _not_ throw an error that is an instance of
         * `constructor`, or alternately that it will not throw an error with message
         * matching `regexp`.
         *
         *     should.not.throw(fn, Error, 'function does not throw');
         *
         * @name not.throw
         * @alias not.Throw
         * @param {Function} function
         * @param {ErrorConstructor} constructor
         * @param {RegExp} regexp
         * @param {String} message
         * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error#Error_types
         * @namespace Should
         * @api public
         */

        should.not.Throw = function (fn, errt, errs, msg) {
          new Assertion(fn, msg).to.not.Throw(errt, errs);
        };

        /**
         * ### .not.exist
         *
         * Asserts that the target is neither `null` nor `undefined`.
         *
         *     var bar = null;
         *
         *     should.not.exist(bar, 'bar does not exist');
         *
         * @name not.exist
         * @namespace Should
         * @api public
         */

        should.not.exist = function (val, msg) {
          new Assertion(val, msg).to.not.exist;
        };

        should['throw'] = should['Throw'];
        should.not['throw'] = should.not['Throw'];

        return should;
      }
      chai.should = loadShould;
      chai.Should = loadShould;
    };

    /*!
     * chai
     * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
     * MIT Licensed
     */

    var assert = function (chai, util) {
      /*!
       * Chai dependencies.
       */

      var Assertion = chai.Assertion
        , flag = util.flag;

      /*!
       * Module export.
       */

      /**
       * ### assert(expression, message)
       *
       * Write your own test expressions.
       *
       *     assert('foo' !== 'bar', 'foo is not bar');
       *     assert(Array.isArray([]), 'empty arrays are arrays');
       *
       * @param {Mixed} expression to test for truthiness
       * @param {String} message to display on error
       * @name assert
       * @namespace Assert
       * @api public
       */

      var assert = chai.assert = function (express, errmsg) {
        var test = new Assertion(null, null, chai.assert, true);
        test.assert(
            express
          , errmsg
          , '[ negation message unavailable ]'
        );
      };

      /**
       * ### .fail([message])
       * ### .fail(actual, expected, [message], [operator])
       *
       * Throw a failure. Node.js `assert` module-compatible.
       *
       *     assert.fail();
       *     assert.fail("custom error message");
       *     assert.fail(1, 2);
       *     assert.fail(1, 2, "custom error message");
       *     assert.fail(1, 2, "custom error message", ">");
       *     assert.fail(1, 2, undefined, ">");
       *
       * @name fail
       * @param {Mixed} actual
       * @param {Mixed} expected
       * @param {String} message
       * @param {String} operator
       * @namespace Assert
       * @api public
       */

      assert.fail = function (actual, expected, message, operator) {
        if (arguments.length < 2) {
            // Comply with Node's fail([message]) interface

            message = actual;
            actual = undefined;
        }

        message = message || 'assert.fail()';
        throw new chai.AssertionError(message, {
            actual: actual
          , expected: expected
          , operator: operator
        }, assert.fail);
      };

      /**
       * ### .isOk(object, [message])
       *
       * Asserts that `object` is truthy.
       *
       *     assert.isOk('everything', 'everything is ok');
       *     assert.isOk(false, 'this will fail');
       *
       * @name isOk
       * @alias ok
       * @param {Mixed} object to test
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.isOk = function (val, msg) {
        new Assertion(val, msg, assert.isOk, true).is.ok;
      };

      /**
       * ### .isNotOk(object, [message])
       *
       * Asserts that `object` is falsy.
       *
       *     assert.isNotOk('everything', 'this will fail');
       *     assert.isNotOk(false, 'this will pass');
       *
       * @name isNotOk
       * @alias notOk
       * @param {Mixed} object to test
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.isNotOk = function (val, msg) {
        new Assertion(val, msg, assert.isNotOk, true).is.not.ok;
      };

      /**
       * ### .equal(actual, expected, [message])
       *
       * Asserts non-strict equality (`==`) of `actual` and `expected`.
       *
       *     assert.equal(3, '3', '== coerces values to strings');
       *
       * @name equal
       * @param {Mixed} actual
       * @param {Mixed} expected
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.equal = function (act, exp, msg) {
        var test = new Assertion(act, msg, assert.equal, true);

        test.assert(
            exp == flag(test, 'object')
          , 'expected #{this} to equal #{exp}'
          , 'expected #{this} to not equal #{act}'
          , exp
          , act
          , true
        );
      };

      /**
       * ### .notEqual(actual, expected, [message])
       *
       * Asserts non-strict inequality (`!=`) of `actual` and `expected`.
       *
       *     assert.notEqual(3, 4, 'these numbers are not equal');
       *
       * @name notEqual
       * @param {Mixed} actual
       * @param {Mixed} expected
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.notEqual = function (act, exp, msg) {
        var test = new Assertion(act, msg, assert.notEqual, true);

        test.assert(
            exp != flag(test, 'object')
          , 'expected #{this} to not equal #{exp}'
          , 'expected #{this} to equal #{act}'
          , exp
          , act
          , true
        );
      };

      /**
       * ### .strictEqual(actual, expected, [message])
       *
       * Asserts strict equality (`===`) of `actual` and `expected`.
       *
       *     assert.strictEqual(true, true, 'these booleans are strictly equal');
       *
       * @name strictEqual
       * @param {Mixed} actual
       * @param {Mixed} expected
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.strictEqual = function (act, exp, msg) {
        new Assertion(act, msg, assert.strictEqual, true).to.equal(exp);
      };

      /**
       * ### .notStrictEqual(actual, expected, [message])
       *
       * Asserts strict inequality (`!==`) of `actual` and `expected`.
       *
       *     assert.notStrictEqual(3, '3', 'no coercion for strict equality');
       *
       * @name notStrictEqual
       * @param {Mixed} actual
       * @param {Mixed} expected
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.notStrictEqual = function (act, exp, msg) {
        new Assertion(act, msg, assert.notStrictEqual, true).to.not.equal(exp);
      };

      /**
       * ### .deepEqual(actual, expected, [message])
       *
       * Asserts that `actual` is deeply equal to `expected`.
       *
       *     assert.deepEqual({ tea: 'green' }, { tea: 'green' });
       *
       * @name deepEqual
       * @param {Mixed} actual
       * @param {Mixed} expected
       * @param {String} message
       * @alias deepStrictEqual
       * @namespace Assert
       * @api public
       */

      assert.deepEqual = assert.deepStrictEqual = function (act, exp, msg) {
        new Assertion(act, msg, assert.deepEqual, true).to.eql(exp);
      };

      /**
       * ### .notDeepEqual(actual, expected, [message])
       *
       * Assert that `actual` is not deeply equal to `expected`.
       *
       *     assert.notDeepEqual({ tea: 'green' }, { tea: 'jasmine' });
       *
       * @name notDeepEqual
       * @param {Mixed} actual
       * @param {Mixed} expected
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.notDeepEqual = function (act, exp, msg) {
        new Assertion(act, msg, assert.notDeepEqual, true).to.not.eql(exp);
      };

       /**
       * ### .isAbove(valueToCheck, valueToBeAbove, [message])
       *
       * Asserts `valueToCheck` is strictly greater than (>) `valueToBeAbove`.
       *
       *     assert.isAbove(5, 2, '5 is strictly greater than 2');
       *
       * @name isAbove
       * @param {Mixed} valueToCheck
       * @param {Mixed} valueToBeAbove
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.isAbove = function (val, abv, msg) {
        new Assertion(val, msg, assert.isAbove, true).to.be.above(abv);
      };

       /**
       * ### .isAtLeast(valueToCheck, valueToBeAtLeast, [message])
       *
       * Asserts `valueToCheck` is greater than or equal to (>=) `valueToBeAtLeast`.
       *
       *     assert.isAtLeast(5, 2, '5 is greater or equal to 2');
       *     assert.isAtLeast(3, 3, '3 is greater or equal to 3');
       *
       * @name isAtLeast
       * @param {Mixed} valueToCheck
       * @param {Mixed} valueToBeAtLeast
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.isAtLeast = function (val, atlst, msg) {
        new Assertion(val, msg, assert.isAtLeast, true).to.be.least(atlst);
      };

       /**
       * ### .isBelow(valueToCheck, valueToBeBelow, [message])
       *
       * Asserts `valueToCheck` is strictly less than (<) `valueToBeBelow`.
       *
       *     assert.isBelow(3, 6, '3 is strictly less than 6');
       *
       * @name isBelow
       * @param {Mixed} valueToCheck
       * @param {Mixed} valueToBeBelow
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.isBelow = function (val, blw, msg) {
        new Assertion(val, msg, assert.isBelow, true).to.be.below(blw);
      };

       /**
       * ### .isAtMost(valueToCheck, valueToBeAtMost, [message])
       *
       * Asserts `valueToCheck` is less than or equal to (<=) `valueToBeAtMost`.
       *
       *     assert.isAtMost(3, 6, '3 is less than or equal to 6');
       *     assert.isAtMost(4, 4, '4 is less than or equal to 4');
       *
       * @name isAtMost
       * @param {Mixed} valueToCheck
       * @param {Mixed} valueToBeAtMost
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.isAtMost = function (val, atmst, msg) {
        new Assertion(val, msg, assert.isAtMost, true).to.be.most(atmst);
      };

      /**
       * ### .isTrue(value, [message])
       *
       * Asserts that `value` is true.
       *
       *     var teaServed = true;
       *     assert.isTrue(teaServed, 'the tea has been served');
       *
       * @name isTrue
       * @param {Mixed} value
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.isTrue = function (val, msg) {
        new Assertion(val, msg, assert.isTrue, true).is['true'];
      };

      /**
       * ### .isNotTrue(value, [message])
       *
       * Asserts that `value` is not true.
       *
       *     var tea = 'tasty chai';
       *     assert.isNotTrue(tea, 'great, time for tea!');
       *
       * @name isNotTrue
       * @param {Mixed} value
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.isNotTrue = function (val, msg) {
        new Assertion(val, msg, assert.isNotTrue, true).to.not.equal(true);
      };

      /**
       * ### .isFalse(value, [message])
       *
       * Asserts that `value` is false.
       *
       *     var teaServed = false;
       *     assert.isFalse(teaServed, 'no tea yet? hmm...');
       *
       * @name isFalse
       * @param {Mixed} value
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.isFalse = function (val, msg) {
        new Assertion(val, msg, assert.isFalse, true).is['false'];
      };

      /**
       * ### .isNotFalse(value, [message])
       *
       * Asserts that `value` is not false.
       *
       *     var tea = 'tasty chai';
       *     assert.isNotFalse(tea, 'great, time for tea!');
       *
       * @name isNotFalse
       * @param {Mixed} value
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.isNotFalse = function (val, msg) {
        new Assertion(val, msg, assert.isNotFalse, true).to.not.equal(false);
      };

      /**
       * ### .isNull(value, [message])
       *
       * Asserts that `value` is null.
       *
       *     assert.isNull(err, 'there was no error');
       *
       * @name isNull
       * @param {Mixed} value
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.isNull = function (val, msg) {
        new Assertion(val, msg, assert.isNull, true).to.equal(null);
      };

      /**
       * ### .isNotNull(value, [message])
       *
       * Asserts that `value` is not null.
       *
       *     var tea = 'tasty chai';
       *     assert.isNotNull(tea, 'great, time for tea!');
       *
       * @name isNotNull
       * @param {Mixed} value
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.isNotNull = function (val, msg) {
        new Assertion(val, msg, assert.isNotNull, true).to.not.equal(null);
      };

      /**
       * ### .isNaN
       *
       * Asserts that value is NaN.
       *
       *     assert.isNaN(NaN, 'NaN is NaN');
       *
       * @name isNaN
       * @param {Mixed} value
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.isNaN = function (val, msg) {
        new Assertion(val, msg, assert.isNaN, true).to.be.NaN;
      };

      /**
       * ### .isNotNaN
       *
       * Asserts that value is not NaN.
       *
       *     assert.isNotNaN(4, '4 is not NaN');
       *
       * @name isNotNaN
       * @param {Mixed} value
       * @param {String} message
       * @namespace Assert
       * @api public
       */
      assert.isNotNaN = function (val, msg) {
        new Assertion(val, msg, assert.isNotNaN, true).not.to.be.NaN;
      };

      /**
       * ### .exists
       *
       * Asserts that the target is neither `null` nor `undefined`.
       *
       *     var foo = 'hi';
       *
       *     assert.exists(foo, 'foo is neither `null` nor `undefined`');
       *
       * @name exists
       * @param {Mixed} value
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.exists = function (val, msg) {
        new Assertion(val, msg, assert.exists, true).to.exist;
      };

      /**
       * ### .notExists
       *
       * Asserts that the target is either `null` or `undefined`.
       *
       *     var bar = null
       *       , baz;
       *
       *     assert.notExists(bar);
       *     assert.notExists(baz, 'baz is either null or undefined');
       *
       * @name notExists
       * @param {Mixed} value
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.notExists = function (val, msg) {
        new Assertion(val, msg, assert.notExists, true).to.not.exist;
      };

      /**
       * ### .isUndefined(value, [message])
       *
       * Asserts that `value` is `undefined`.
       *
       *     var tea;
       *     assert.isUndefined(tea, 'no tea defined');
       *
       * @name isUndefined
       * @param {Mixed} value
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.isUndefined = function (val, msg) {
        new Assertion(val, msg, assert.isUndefined, true).to.equal(undefined);
      };

      /**
       * ### .isDefined(value, [message])
       *
       * Asserts that `value` is not `undefined`.
       *
       *     var tea = 'cup of chai';
       *     assert.isDefined(tea, 'tea has been defined');
       *
       * @name isDefined
       * @param {Mixed} value
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.isDefined = function (val, msg) {
        new Assertion(val, msg, assert.isDefined, true).to.not.equal(undefined);
      };

      /**
       * ### .isFunction(value, [message])
       *
       * Asserts that `value` is a function.
       *
       *     function serveTea() { return 'cup of tea'; };
       *     assert.isFunction(serveTea, 'great, we can have tea now');
       *
       * @name isFunction
       * @param {Mixed} value
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.isFunction = function (val, msg) {
        new Assertion(val, msg, assert.isFunction, true).to.be.a('function');
      };

      /**
       * ### .isNotFunction(value, [message])
       *
       * Asserts that `value` is _not_ a function.
       *
       *     var serveTea = [ 'heat', 'pour', 'sip' ];
       *     assert.isNotFunction(serveTea, 'great, we have listed the steps');
       *
       * @name isNotFunction
       * @param {Mixed} value
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.isNotFunction = function (val, msg) {
        new Assertion(val, msg, assert.isNotFunction, true).to.not.be.a('function');
      };

      /**
       * ### .isObject(value, [message])
       *
       * Asserts that `value` is an object of type 'Object' (as revealed by `Object.prototype.toString`).
       * _The assertion does not match subclassed objects._
       *
       *     var selection = { name: 'Chai', serve: 'with spices' };
       *     assert.isObject(selection, 'tea selection is an object');
       *
       * @name isObject
       * @param {Mixed} value
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.isObject = function (val, msg) {
        new Assertion(val, msg, assert.isObject, true).to.be.a('object');
      };

      /**
       * ### .isNotObject(value, [message])
       *
       * Asserts that `value` is _not_ an object of type 'Object' (as revealed by `Object.prototype.toString`).
       *
       *     var selection = 'chai'
       *     assert.isNotObject(selection, 'tea selection is not an object');
       *     assert.isNotObject(null, 'null is not an object');
       *
       * @name isNotObject
       * @param {Mixed} value
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.isNotObject = function (val, msg) {
        new Assertion(val, msg, assert.isNotObject, true).to.not.be.a('object');
      };

      /**
       * ### .isArray(value, [message])
       *
       * Asserts that `value` is an array.
       *
       *     var menu = [ 'green', 'chai', 'oolong' ];
       *     assert.isArray(menu, 'what kind of tea do we want?');
       *
       * @name isArray
       * @param {Mixed} value
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.isArray = function (val, msg) {
        new Assertion(val, msg, assert.isArray, true).to.be.an('array');
      };

      /**
       * ### .isNotArray(value, [message])
       *
       * Asserts that `value` is _not_ an array.
       *
       *     var menu = 'green|chai|oolong';
       *     assert.isNotArray(menu, 'what kind of tea do we want?');
       *
       * @name isNotArray
       * @param {Mixed} value
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.isNotArray = function (val, msg) {
        new Assertion(val, msg, assert.isNotArray, true).to.not.be.an('array');
      };

      /**
       * ### .isString(value, [message])
       *
       * Asserts that `value` is a string.
       *
       *     var teaOrder = 'chai';
       *     assert.isString(teaOrder, 'order placed');
       *
       * @name isString
       * @param {Mixed} value
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.isString = function (val, msg) {
        new Assertion(val, msg, assert.isString, true).to.be.a('string');
      };

      /**
       * ### .isNotString(value, [message])
       *
       * Asserts that `value` is _not_ a string.
       *
       *     var teaOrder = 4;
       *     assert.isNotString(teaOrder, 'order placed');
       *
       * @name isNotString
       * @param {Mixed} value
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.isNotString = function (val, msg) {
        new Assertion(val, msg, assert.isNotString, true).to.not.be.a('string');
      };

      /**
       * ### .isNumber(value, [message])
       *
       * Asserts that `value` is a number.
       *
       *     var cups = 2;
       *     assert.isNumber(cups, 'how many cups');
       *
       * @name isNumber
       * @param {Number} value
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.isNumber = function (val, msg) {
        new Assertion(val, msg, assert.isNumber, true).to.be.a('number');
      };

      /**
       * ### .isNotNumber(value, [message])
       *
       * Asserts that `value` is _not_ a number.
       *
       *     var cups = '2 cups please';
       *     assert.isNotNumber(cups, 'how many cups');
       *
       * @name isNotNumber
       * @param {Mixed} value
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.isNotNumber = function (val, msg) {
        new Assertion(val, msg, assert.isNotNumber, true).to.not.be.a('number');
      };

       /**
       * ### .isFinite(value, [message])
       *
       * Asserts that `value` is a finite number. Unlike `.isNumber`, this will fail for `NaN` and `Infinity`.
       *
       *     var cups = 2;
       *     assert.isFinite(cups, 'how many cups');
       *
       *     assert.isFinite(NaN); // throws
       *
       * @name isFinite
       * @param {Number} value
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.isFinite = function (val, msg) {
        new Assertion(val, msg, assert.isFinite, true).to.be.finite;
      };

      /**
       * ### .isBoolean(value, [message])
       *
       * Asserts that `value` is a boolean.
       *
       *     var teaReady = true
       *       , teaServed = false;
       *
       *     assert.isBoolean(teaReady, 'is the tea ready');
       *     assert.isBoolean(teaServed, 'has tea been served');
       *
       * @name isBoolean
       * @param {Mixed} value
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.isBoolean = function (val, msg) {
        new Assertion(val, msg, assert.isBoolean, true).to.be.a('boolean');
      };

      /**
       * ### .isNotBoolean(value, [message])
       *
       * Asserts that `value` is _not_ a boolean.
       *
       *     var teaReady = 'yep'
       *       , teaServed = 'nope';
       *
       *     assert.isNotBoolean(teaReady, 'is the tea ready');
       *     assert.isNotBoolean(teaServed, 'has tea been served');
       *
       * @name isNotBoolean
       * @param {Mixed} value
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.isNotBoolean = function (val, msg) {
        new Assertion(val, msg, assert.isNotBoolean, true).to.not.be.a('boolean');
      };

      /**
       * ### .typeOf(value, name, [message])
       *
       * Asserts that `value`'s type is `name`, as determined by
       * `Object.prototype.toString`.
       *
       *     assert.typeOf({ tea: 'chai' }, 'object', 'we have an object');
       *     assert.typeOf(['chai', 'jasmine'], 'array', 'we have an array');
       *     assert.typeOf('tea', 'string', 'we have a string');
       *     assert.typeOf(/tea/, 'regexp', 'we have a regular expression');
       *     assert.typeOf(null, 'null', 'we have a null');
       *     assert.typeOf(undefined, 'undefined', 'we have an undefined');
       *
       * @name typeOf
       * @param {Mixed} value
       * @param {String} name
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.typeOf = function (val, type, msg) {
        new Assertion(val, msg, assert.typeOf, true).to.be.a(type);
      };

      /**
       * ### .notTypeOf(value, name, [message])
       *
       * Asserts that `value`'s type is _not_ `name`, as determined by
       * `Object.prototype.toString`.
       *
       *     assert.notTypeOf('tea', 'number', 'strings are not numbers');
       *
       * @name notTypeOf
       * @param {Mixed} value
       * @param {String} typeof name
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.notTypeOf = function (val, type, msg) {
        new Assertion(val, msg, assert.notTypeOf, true).to.not.be.a(type);
      };

      /**
       * ### .instanceOf(object, constructor, [message])
       *
       * Asserts that `value` is an instance of `constructor`.
       *
       *     var Tea = function (name) { this.name = name; }
       *       , chai = new Tea('chai');
       *
       *     assert.instanceOf(chai, Tea, 'chai is an instance of tea');
       *
       * @name instanceOf
       * @param {Object} object
       * @param {Constructor} constructor
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.instanceOf = function (val, type, msg) {
        new Assertion(val, msg, assert.instanceOf, true).to.be.instanceOf(type);
      };

      /**
       * ### .notInstanceOf(object, constructor, [message])
       *
       * Asserts `value` is not an instance of `constructor`.
       *
       *     var Tea = function (name) { this.name = name; }
       *       , chai = new String('chai');
       *
       *     assert.notInstanceOf(chai, Tea, 'chai is not an instance of tea');
       *
       * @name notInstanceOf
       * @param {Object} object
       * @param {Constructor} constructor
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.notInstanceOf = function (val, type, msg) {
        new Assertion(val, msg, assert.notInstanceOf, true)
          .to.not.be.instanceOf(type);
      };

      /**
       * ### .include(haystack, needle, [message])
       *
       * Asserts that `haystack` includes `needle`. Can be used to assert the
       * inclusion of a value in an array, a substring in a string, or a subset of
       * properties in an object.
       *
       *     assert.include([1,2,3], 2, 'array contains value');
       *     assert.include('foobar', 'foo', 'string contains substring');
       *     assert.include({ foo: 'bar', hello: 'universe' }, { foo: 'bar' }, 'object contains property');
       *
       * Strict equality (===) is used. When asserting the inclusion of a value in
       * an array, the array is searched for an element that's strictly equal to the
       * given value. When asserting a subset of properties in an object, the object
       * is searched for the given property keys, checking that each one is present
       * and strictly equal to the given property value. For instance:
       *
       *     var obj1 = {a: 1}
       *       , obj2 = {b: 2};
       *     assert.include([obj1, obj2], obj1);
       *     assert.include({foo: obj1, bar: obj2}, {foo: obj1});
       *     assert.include({foo: obj1, bar: obj2}, {foo: obj1, bar: obj2});
       *
       * @name include
       * @param {Array|String} haystack
       * @param {Mixed} needle
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.include = function (exp, inc, msg) {
        new Assertion(exp, msg, assert.include, true).include(inc);
      };

      /**
       * ### .notInclude(haystack, needle, [message])
       *
       * Asserts that `haystack` does not include `needle`. Can be used to assert
       * the absence of a value in an array, a substring in a string, or a subset of
       * properties in an object.
       *
       *     assert.notInclude([1,2,3], 4, "array doesn't contain value");
       *     assert.notInclude('foobar', 'baz', "string doesn't contain substring");
       *     assert.notInclude({ foo: 'bar', hello: 'universe' }, { foo: 'baz' }, 'object doesn't contain property');
       *
       * Strict equality (===) is used. When asserting the absence of a value in an
       * array, the array is searched to confirm the absence of an element that's
       * strictly equal to the given value. When asserting a subset of properties in
       * an object, the object is searched to confirm that at least one of the given
       * property keys is either not present or not strictly equal to the given
       * property value. For instance:
       *
       *     var obj1 = {a: 1}
       *       , obj2 = {b: 2};
       *     assert.notInclude([obj1, obj2], {a: 1});
       *     assert.notInclude({foo: obj1, bar: obj2}, {foo: {a: 1}});
       *     assert.notInclude({foo: obj1, bar: obj2}, {foo: obj1, bar: {b: 2}});
       *
       * @name notInclude
       * @param {Array|String} haystack
       * @param {Mixed} needle
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.notInclude = function (exp, inc, msg) {
        new Assertion(exp, msg, assert.notInclude, true).not.include(inc);
      };

      /**
       * ### .deepInclude(haystack, needle, [message])
       *
       * Asserts that `haystack` includes `needle`. Can be used to assert the
       * inclusion of a value in an array or a subset of properties in an object.
       * Deep equality is used.
       *
       *     var obj1 = {a: 1}
       *       , obj2 = {b: 2};
       *     assert.deepInclude([obj1, obj2], {a: 1});
       *     assert.deepInclude({foo: obj1, bar: obj2}, {foo: {a: 1}});
       *     assert.deepInclude({foo: obj1, bar: obj2}, {foo: {a: 1}, bar: {b: 2}});
       *
       * @name deepInclude
       * @param {Array|String} haystack
       * @param {Mixed} needle
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.deepInclude = function (exp, inc, msg) {
        new Assertion(exp, msg, assert.deepInclude, true).deep.include(inc);
      };

      /**
       * ### .notDeepInclude(haystack, needle, [message])
       *
       * Asserts that `haystack` does not include `needle`. Can be used to assert
       * the absence of a value in an array or a subset of properties in an object.
       * Deep equality is used.
       *
       *     var obj1 = {a: 1}
       *       , obj2 = {b: 2};
       *     assert.notDeepInclude([obj1, obj2], {a: 9});
       *     assert.notDeepInclude({foo: obj1, bar: obj2}, {foo: {a: 9}});
       *     assert.notDeepInclude({foo: obj1, bar: obj2}, {foo: {a: 1}, bar: {b: 9}});
       *
       * @name notDeepInclude
       * @param {Array|String} haystack
       * @param {Mixed} needle
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.notDeepInclude = function (exp, inc, msg) {
        new Assertion(exp, msg, assert.notDeepInclude, true).not.deep.include(inc);
      };

      /**
       * ### .nestedInclude(haystack, needle, [message])
       *
       * Asserts that 'haystack' includes 'needle'.
       * Can be used to assert the inclusion of a subset of properties in an
       * object.
       * Enables the use of dot- and bracket-notation for referencing nested
       * properties.
       * '[]' and '.' in property names can be escaped using double backslashes.
       *
       *     assert.nestedInclude({'.a': {'b': 'x'}}, {'\\.a.[b]': 'x'});
       *     assert.nestedInclude({'a': {'[b]': 'x'}}, {'a.\\[b\\]': 'x'});
       *
       * @name nestedInclude
       * @param {Object} haystack
       * @param {Object} needle
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.nestedInclude = function (exp, inc, msg) {
        new Assertion(exp, msg, assert.nestedInclude, true).nested.include(inc);
      };

      /**
       * ### .notNestedInclude(haystack, needle, [message])
       *
       * Asserts that 'haystack' does not include 'needle'.
       * Can be used to assert the absence of a subset of properties in an
       * object.
       * Enables the use of dot- and bracket-notation for referencing nested
       * properties.
       * '[]' and '.' in property names can be escaped using double backslashes.
       *
       *     assert.notNestedInclude({'.a': {'b': 'x'}}, {'\\.a.b': 'y'});
       *     assert.notNestedInclude({'a': {'[b]': 'x'}}, {'a.\\[b\\]': 'y'});
       *
       * @name notNestedInclude
       * @param {Object} haystack
       * @param {Object} needle
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.notNestedInclude = function (exp, inc, msg) {
        new Assertion(exp, msg, assert.notNestedInclude, true)
          .not.nested.include(inc);
      };

      /**
       * ### .deepNestedInclude(haystack, needle, [message])
       *
       * Asserts that 'haystack' includes 'needle'.
       * Can be used to assert the inclusion of a subset of properties in an
       * object while checking for deep equality.
       * Enables the use of dot- and bracket-notation for referencing nested
       * properties.
       * '[]' and '.' in property names can be escaped using double backslashes.
       *
       *     assert.deepNestedInclude({a: {b: [{x: 1}]}}, {'a.b[0]': {x: 1}});
       *     assert.deepNestedInclude({'.a': {'[b]': {x: 1}}}, {'\\.a.\\[b\\]': {x: 1}});
       *
       * @name deepNestedInclude
       * @param {Object} haystack
       * @param {Object} needle
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.deepNestedInclude = function(exp, inc, msg) {
        new Assertion(exp, msg, assert.deepNestedInclude, true)
          .deep.nested.include(inc);
      };

      /**
       * ### .notDeepNestedInclude(haystack, needle, [message])
       *
       * Asserts that 'haystack' does not include 'needle'.
       * Can be used to assert the absence of a subset of properties in an
       * object while checking for deep equality.
       * Enables the use of dot- and bracket-notation for referencing nested
       * properties.
       * '[]' and '.' in property names can be escaped using double backslashes.
       *
       *     assert.notDeepNestedInclude({a: {b: [{x: 1}]}}, {'a.b[0]': {y: 1}})
       *     assert.notDeepNestedInclude({'.a': {'[b]': {x: 1}}}, {'\\.a.\\[b\\]': {y: 2}});
       *
       * @name notDeepNestedInclude
       * @param {Object} haystack
       * @param {Object} needle
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.notDeepNestedInclude = function(exp, inc, msg) {
        new Assertion(exp, msg, assert.notDeepNestedInclude, true)
          .not.deep.nested.include(inc);
      };

      /**
       * ### .ownInclude(haystack, needle, [message])
       *
       * Asserts that 'haystack' includes 'needle'.
       * Can be used to assert the inclusion of a subset of properties in an
       * object while ignoring inherited properties.
       *
       *     assert.ownInclude({ a: 1 }, { a: 1 });
       *
       * @name ownInclude
       * @param {Object} haystack
       * @param {Object} needle
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.ownInclude = function(exp, inc, msg) {
        new Assertion(exp, msg, assert.ownInclude, true).own.include(inc);
      };

      /**
       * ### .notOwnInclude(haystack, needle, [message])
       *
       * Asserts that 'haystack' includes 'needle'.
       * Can be used to assert the absence of a subset of properties in an
       * object while ignoring inherited properties.
       *
       *     Object.prototype.b = 2;
       *
       *     assert.notOwnInclude({ a: 1 }, { b: 2 });
       *
       * @name notOwnInclude
       * @param {Object} haystack
       * @param {Object} needle
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.notOwnInclude = function(exp, inc, msg) {
        new Assertion(exp, msg, assert.notOwnInclude, true).not.own.include(inc);
      };

      /**
       * ### .deepOwnInclude(haystack, needle, [message])
       *
       * Asserts that 'haystack' includes 'needle'.
       * Can be used to assert the inclusion of a subset of properties in an
       * object while ignoring inherited properties and checking for deep equality.
       *
       *      assert.deepOwnInclude({a: {b: 2}}, {a: {b: 2}});
       *
       * @name deepOwnInclude
       * @param {Object} haystack
       * @param {Object} needle
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.deepOwnInclude = function(exp, inc, msg) {
        new Assertion(exp, msg, assert.deepOwnInclude, true)
          .deep.own.include(inc);
      };

       /**
       * ### .notDeepOwnInclude(haystack, needle, [message])
       *
       * Asserts that 'haystack' includes 'needle'.
       * Can be used to assert the absence of a subset of properties in an
       * object while ignoring inherited properties and checking for deep equality.
       *
       *      assert.notDeepOwnInclude({a: {b: 2}}, {a: {c: 3}});
       *
       * @name notDeepOwnInclude
       * @param {Object} haystack
       * @param {Object} needle
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.notDeepOwnInclude = function(exp, inc, msg) {
        new Assertion(exp, msg, assert.notDeepOwnInclude, true)
          .not.deep.own.include(inc);
      };

      /**
       * ### .match(value, regexp, [message])
       *
       * Asserts that `value` matches the regular expression `regexp`.
       *
       *     assert.match('foobar', /^foo/, 'regexp matches');
       *
       * @name match
       * @param {Mixed} value
       * @param {RegExp} regexp
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.match = function (exp, re, msg) {
        new Assertion(exp, msg, assert.match, true).to.match(re);
      };

      /**
       * ### .notMatch(value, regexp, [message])
       *
       * Asserts that `value` does not match the regular expression `regexp`.
       *
       *     assert.notMatch('foobar', /^foo/, 'regexp does not match');
       *
       * @name notMatch
       * @param {Mixed} value
       * @param {RegExp} regexp
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.notMatch = function (exp, re, msg) {
        new Assertion(exp, msg, assert.notMatch, true).to.not.match(re);
      };

      /**
       * ### .property(object, property, [message])
       *
       * Asserts that `object` has a direct or inherited property named by
       * `property`.
       *
       *     assert.property({ tea: { green: 'matcha' }}, 'tea');
       *     assert.property({ tea: { green: 'matcha' }}, 'toString');
       *
       * @name property
       * @param {Object} object
       * @param {String} property
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.property = function (obj, prop, msg) {
        new Assertion(obj, msg, assert.property, true).to.have.property(prop);
      };

      /**
       * ### .notProperty(object, property, [message])
       *
       * Asserts that `object` does _not_ have a direct or inherited property named
       * by `property`.
       *
       *     assert.notProperty({ tea: { green: 'matcha' }}, 'coffee');
       *
       * @name notProperty
       * @param {Object} object
       * @param {String} property
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.notProperty = function (obj, prop, msg) {
        new Assertion(obj, msg, assert.notProperty, true)
          .to.not.have.property(prop);
      };

      /**
       * ### .propertyVal(object, property, value, [message])
       *
       * Asserts that `object` has a direct or inherited property named by
       * `property` with a value given by `value`. Uses a strict equality check
       * (===).
       *
       *     assert.propertyVal({ tea: 'is good' }, 'tea', 'is good');
       *
       * @name propertyVal
       * @param {Object} object
       * @param {String} property
       * @param {Mixed} value
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.propertyVal = function (obj, prop, val, msg) {
        new Assertion(obj, msg, assert.propertyVal, true)
          .to.have.property(prop, val);
      };

      /**
       * ### .notPropertyVal(object, property, value, [message])
       *
       * Asserts that `object` does _not_ have a direct or inherited property named
       * by `property` with value given by `value`. Uses a strict equality check
       * (===).
       *
       *     assert.notPropertyVal({ tea: 'is good' }, 'tea', 'is bad');
       *     assert.notPropertyVal({ tea: 'is good' }, 'coffee', 'is good');
       *
       * @name notPropertyVal
       * @param {Object} object
       * @param {String} property
       * @param {Mixed} value
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.notPropertyVal = function (obj, prop, val, msg) {
        new Assertion(obj, msg, assert.notPropertyVal, true)
          .to.not.have.property(prop, val);
      };

      /**
       * ### .deepPropertyVal(object, property, value, [message])
       *
       * Asserts that `object` has a direct or inherited property named by
       * `property` with a value given by `value`. Uses a deep equality check.
       *
       *     assert.deepPropertyVal({ tea: { green: 'matcha' } }, 'tea', { green: 'matcha' });
       *
       * @name deepPropertyVal
       * @param {Object} object
       * @param {String} property
       * @param {Mixed} value
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.deepPropertyVal = function (obj, prop, val, msg) {
        new Assertion(obj, msg, assert.deepPropertyVal, true)
          .to.have.deep.property(prop, val);
      };

      /**
       * ### .notDeepPropertyVal(object, property, value, [message])
       *
       * Asserts that `object` does _not_ have a direct or inherited property named
       * by `property` with value given by `value`. Uses a deep equality check.
       *
       *     assert.notDeepPropertyVal({ tea: { green: 'matcha' } }, 'tea', { black: 'matcha' });
       *     assert.notDeepPropertyVal({ tea: { green: 'matcha' } }, 'tea', { green: 'oolong' });
       *     assert.notDeepPropertyVal({ tea: { green: 'matcha' } }, 'coffee', { green: 'matcha' });
       *
       * @name notDeepPropertyVal
       * @param {Object} object
       * @param {String} property
       * @param {Mixed} value
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.notDeepPropertyVal = function (obj, prop, val, msg) {
        new Assertion(obj, msg, assert.notDeepPropertyVal, true)
          .to.not.have.deep.property(prop, val);
      };

      /**
       * ### .ownProperty(object, property, [message])
       *
       * Asserts that `object` has a direct property named by `property`. Inherited
       * properties aren't checked.
       *
       *     assert.ownProperty({ tea: { green: 'matcha' }}, 'tea');
       *
       * @name ownProperty
       * @param {Object} object
       * @param {String} property
       * @param {String} message
       * @api public
       */

      assert.ownProperty = function (obj, prop, msg) {
        new Assertion(obj, msg, assert.ownProperty, true)
          .to.have.own.property(prop);
      };

      /**
       * ### .notOwnProperty(object, property, [message])
       *
       * Asserts that `object` does _not_ have a direct property named by
       * `property`. Inherited properties aren't checked.
       *
       *     assert.notOwnProperty({ tea: { green: 'matcha' }}, 'coffee');
       *     assert.notOwnProperty({}, 'toString');
       *
       * @name notOwnProperty
       * @param {Object} object
       * @param {String} property
       * @param {String} message
       * @api public
       */

      assert.notOwnProperty = function (obj, prop, msg) {
        new Assertion(obj, msg, assert.notOwnProperty, true)
          .to.not.have.own.property(prop);
      };

      /**
       * ### .ownPropertyVal(object, property, value, [message])
       *
       * Asserts that `object` has a direct property named by `property` and a value
       * equal to the provided `value`. Uses a strict equality check (===).
       * Inherited properties aren't checked.
       *
       *     assert.ownPropertyVal({ coffee: 'is good'}, 'coffee', 'is good');
       *
       * @name ownPropertyVal
       * @param {Object} object
       * @param {String} property
       * @param {Mixed} value
       * @param {String} message
       * @api public
       */

      assert.ownPropertyVal = function (obj, prop, value, msg) {
        new Assertion(obj, msg, assert.ownPropertyVal, true)
          .to.have.own.property(prop, value);
      };

      /**
       * ### .notOwnPropertyVal(object, property, value, [message])
       *
       * Asserts that `object` does _not_ have a direct property named by `property`
       * with a value equal to the provided `value`. Uses a strict equality check
       * (===). Inherited properties aren't checked.
       *
       *     assert.notOwnPropertyVal({ tea: 'is better'}, 'tea', 'is worse');
       *     assert.notOwnPropertyVal({}, 'toString', Object.prototype.toString);
       *
       * @name notOwnPropertyVal
       * @param {Object} object
       * @param {String} property
       * @param {Mixed} value
       * @param {String} message
       * @api public
       */

      assert.notOwnPropertyVal = function (obj, prop, value, msg) {
        new Assertion(obj, msg, assert.notOwnPropertyVal, true)
          .to.not.have.own.property(prop, value);
      };

      /**
       * ### .deepOwnPropertyVal(object, property, value, [message])
       *
       * Asserts that `object` has a direct property named by `property` and a value
       * equal to the provided `value`. Uses a deep equality check. Inherited
       * properties aren't checked.
       *
       *     assert.deepOwnPropertyVal({ tea: { green: 'matcha' } }, 'tea', { green: 'matcha' });
       *
       * @name deepOwnPropertyVal
       * @param {Object} object
       * @param {String} property
       * @param {Mixed} value
       * @param {String} message
       * @api public
       */

      assert.deepOwnPropertyVal = function (obj, prop, value, msg) {
        new Assertion(obj, msg, assert.deepOwnPropertyVal, true)
          .to.have.deep.own.property(prop, value);
      };

      /**
       * ### .notDeepOwnPropertyVal(object, property, value, [message])
       *
       * Asserts that `object` does _not_ have a direct property named by `property`
       * with a value equal to the provided `value`. Uses a deep equality check.
       * Inherited properties aren't checked.
       *
       *     assert.notDeepOwnPropertyVal({ tea: { green: 'matcha' } }, 'tea', { black: 'matcha' });
       *     assert.notDeepOwnPropertyVal({ tea: { green: 'matcha' } }, 'tea', { green: 'oolong' });
       *     assert.notDeepOwnPropertyVal({ tea: { green: 'matcha' } }, 'coffee', { green: 'matcha' });
       *     assert.notDeepOwnPropertyVal({}, 'toString', Object.prototype.toString);
       *
       * @name notDeepOwnPropertyVal
       * @param {Object} object
       * @param {String} property
       * @param {Mixed} value
       * @param {String} message
       * @api public
       */

      assert.notDeepOwnPropertyVal = function (obj, prop, value, msg) {
        new Assertion(obj, msg, assert.notDeepOwnPropertyVal, true)
          .to.not.have.deep.own.property(prop, value);
      };

      /**
       * ### .nestedProperty(object, property, [message])
       *
       * Asserts that `object` has a direct or inherited property named by
       * `property`, which can be a string using dot- and bracket-notation for
       * nested reference.
       *
       *     assert.nestedProperty({ tea: { green: 'matcha' }}, 'tea.green');
       *
       * @name nestedProperty
       * @param {Object} object
       * @param {String} property
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.nestedProperty = function (obj, prop, msg) {
        new Assertion(obj, msg, assert.nestedProperty, true)
          .to.have.nested.property(prop);
      };

      /**
       * ### .notNestedProperty(object, property, [message])
       *
       * Asserts that `object` does _not_ have a property named by `property`, which
       * can be a string using dot- and bracket-notation for nested reference. The
       * property cannot exist on the object nor anywhere in its prototype chain.
       *
       *     assert.notNestedProperty({ tea: { green: 'matcha' }}, 'tea.oolong');
       *
       * @name notNestedProperty
       * @param {Object} object
       * @param {String} property
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.notNestedProperty = function (obj, prop, msg) {
        new Assertion(obj, msg, assert.notNestedProperty, true)
          .to.not.have.nested.property(prop);
      };

      /**
       * ### .nestedPropertyVal(object, property, value, [message])
       *
       * Asserts that `object` has a property named by `property` with value given
       * by `value`. `property` can use dot- and bracket-notation for nested
       * reference. Uses a strict equality check (===).
       *
       *     assert.nestedPropertyVal({ tea: { green: 'matcha' }}, 'tea.green', 'matcha');
       *
       * @name nestedPropertyVal
       * @param {Object} object
       * @param {String} property
       * @param {Mixed} value
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.nestedPropertyVal = function (obj, prop, val, msg) {
        new Assertion(obj, msg, assert.nestedPropertyVal, true)
          .to.have.nested.property(prop, val);
      };

      /**
       * ### .notNestedPropertyVal(object, property, value, [message])
       *
       * Asserts that `object` does _not_ have a property named by `property` with
       * value given by `value`. `property` can use dot- and bracket-notation for
       * nested reference. Uses a strict equality check (===).
       *
       *     assert.notNestedPropertyVal({ tea: { green: 'matcha' }}, 'tea.green', 'konacha');
       *     assert.notNestedPropertyVal({ tea: { green: 'matcha' }}, 'coffee.green', 'matcha');
       *
       * @name notNestedPropertyVal
       * @param {Object} object
       * @param {String} property
       * @param {Mixed} value
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.notNestedPropertyVal = function (obj, prop, val, msg) {
        new Assertion(obj, msg, assert.notNestedPropertyVal, true)
          .to.not.have.nested.property(prop, val);
      };

      /**
       * ### .deepNestedPropertyVal(object, property, value, [message])
       *
       * Asserts that `object` has a property named by `property` with a value given
       * by `value`. `property` can use dot- and bracket-notation for nested
       * reference. Uses a deep equality check.
       *
       *     assert.deepNestedPropertyVal({ tea: { green: { matcha: 'yum' } } }, 'tea.green', { matcha: 'yum' });
       *
       * @name deepNestedPropertyVal
       * @param {Object} object
       * @param {String} property
       * @param {Mixed} value
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.deepNestedPropertyVal = function (obj, prop, val, msg) {
        new Assertion(obj, msg, assert.deepNestedPropertyVal, true)
          .to.have.deep.nested.property(prop, val);
      };

      /**
       * ### .notDeepNestedPropertyVal(object, property, value, [message])
       *
       * Asserts that `object` does _not_ have a property named by `property` with
       * value given by `value`. `property` can use dot- and bracket-notation for
       * nested reference. Uses a deep equality check.
       *
       *     assert.notDeepNestedPropertyVal({ tea: { green: { matcha: 'yum' } } }, 'tea.green', { oolong: 'yum' });
       *     assert.notDeepNestedPropertyVal({ tea: { green: { matcha: 'yum' } } }, 'tea.green', { matcha: 'yuck' });
       *     assert.notDeepNestedPropertyVal({ tea: { green: { matcha: 'yum' } } }, 'tea.black', { matcha: 'yum' });
       *
       * @name notDeepNestedPropertyVal
       * @param {Object} object
       * @param {String} property
       * @param {Mixed} value
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.notDeepNestedPropertyVal = function (obj, prop, val, msg) {
        new Assertion(obj, msg, assert.notDeepNestedPropertyVal, true)
          .to.not.have.deep.nested.property(prop, val);
      };

      /**
       * ### .lengthOf(object, length, [message])
       *
       * Asserts that `object` has a `length` or `size` with the expected value.
       *
       *     assert.lengthOf([1,2,3], 3, 'array has length of 3');
       *     assert.lengthOf('foobar', 6, 'string has length of 6');
       *     assert.lengthOf(new Set([1,2,3]), 3, 'set has size of 3');
       *     assert.lengthOf(new Map([['a',1],['b',2],['c',3]]), 3, 'map has size of 3');
       *
       * @name lengthOf
       * @param {Mixed} object
       * @param {Number} length
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.lengthOf = function (exp, len, msg) {
        new Assertion(exp, msg, assert.lengthOf, true).to.have.lengthOf(len);
      };

      /**
       * ### .hasAnyKeys(object, [keys], [message])
       *
       * Asserts that `object` has at least one of the `keys` provided.
       * You can also provide a single object instead of a `keys` array and its keys
       * will be used as the expected set of keys.
       *
       *     assert.hasAnyKeys({foo: 1, bar: 2, baz: 3}, ['foo', 'iDontExist', 'baz']);
       *     assert.hasAnyKeys({foo: 1, bar: 2, baz: 3}, {foo: 30, iDontExist: 99, baz: 1337});
       *     assert.hasAnyKeys(new Map([[{foo: 1}, 'bar'], ['key', 'value']]), [{foo: 1}, 'key']);
       *     assert.hasAnyKeys(new Set([{foo: 'bar'}, 'anotherKey']), [{foo: 'bar'}, 'anotherKey']);
       *
       * @name hasAnyKeys
       * @param {Mixed} object
       * @param {Array|Object} keys
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.hasAnyKeys = function (obj, keys, msg) {
        new Assertion(obj, msg, assert.hasAnyKeys, true).to.have.any.keys(keys);
      };

      /**
       * ### .hasAllKeys(object, [keys], [message])
       *
       * Asserts that `object` has all and only all of the `keys` provided.
       * You can also provide a single object instead of a `keys` array and its keys
       * will be used as the expected set of keys.
       *
       *     assert.hasAllKeys({foo: 1, bar: 2, baz: 3}, ['foo', 'bar', 'baz']);
       *     assert.hasAllKeys({foo: 1, bar: 2, baz: 3}, {foo: 30, bar: 99, baz: 1337]);
       *     assert.hasAllKeys(new Map([[{foo: 1}, 'bar'], ['key', 'value']]), [{foo: 1}, 'key']);
       *     assert.hasAllKeys(new Set([{foo: 'bar'}, 'anotherKey'], [{foo: 'bar'}, 'anotherKey']);
       *
       * @name hasAllKeys
       * @param {Mixed} object
       * @param {String[]} keys
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.hasAllKeys = function (obj, keys, msg) {
        new Assertion(obj, msg, assert.hasAllKeys, true).to.have.all.keys(keys);
      };

      /**
       * ### .containsAllKeys(object, [keys], [message])
       *
       * Asserts that `object` has all of the `keys` provided but may have more keys not listed.
       * You can also provide a single object instead of a `keys` array and its keys
       * will be used as the expected set of keys.
       *
       *     assert.containsAllKeys({foo: 1, bar: 2, baz: 3}, ['foo', 'baz']);
       *     assert.containsAllKeys({foo: 1, bar: 2, baz: 3}, ['foo', 'bar', 'baz']);
       *     assert.containsAllKeys({foo: 1, bar: 2, baz: 3}, {foo: 30, baz: 1337});
       *     assert.containsAllKeys({foo: 1, bar: 2, baz: 3}, {foo: 30, bar: 99, baz: 1337});
       *     assert.containsAllKeys(new Map([[{foo: 1}, 'bar'], ['key', 'value']]), [{foo: 1}]);
       *     assert.containsAllKeys(new Map([[{foo: 1}, 'bar'], ['key', 'value']]), [{foo: 1}, 'key']);
       *     assert.containsAllKeys(new Set([{foo: 'bar'}, 'anotherKey'], [{foo: 'bar'}]);
       *     assert.containsAllKeys(new Set([{foo: 'bar'}, 'anotherKey'], [{foo: 'bar'}, 'anotherKey']);
       *
       * @name containsAllKeys
       * @param {Mixed} object
       * @param {String[]} keys
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.containsAllKeys = function (obj, keys, msg) {
        new Assertion(obj, msg, assert.containsAllKeys, true)
          .to.contain.all.keys(keys);
      };

      /**
       * ### .doesNotHaveAnyKeys(object, [keys], [message])
       *
       * Asserts that `object` has none of the `keys` provided.
       * You can also provide a single object instead of a `keys` array and its keys
       * will be used as the expected set of keys.
       *
       *     assert.doesNotHaveAnyKeys({foo: 1, bar: 2, baz: 3}, ['one', 'two', 'example']);
       *     assert.doesNotHaveAnyKeys({foo: 1, bar: 2, baz: 3}, {one: 1, two: 2, example: 'foo'});
       *     assert.doesNotHaveAnyKeys(new Map([[{foo: 1}, 'bar'], ['key', 'value']]), [{one: 'two'}, 'example']);
       *     assert.doesNotHaveAnyKeys(new Set([{foo: 'bar'}, 'anotherKey'], [{one: 'two'}, 'example']);
       *
       * @name doesNotHaveAnyKeys
       * @param {Mixed} object
       * @param {String[]} keys
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.doesNotHaveAnyKeys = function (obj, keys, msg) {
        new Assertion(obj, msg, assert.doesNotHaveAnyKeys, true)
          .to.not.have.any.keys(keys);
      };

      /**
       * ### .doesNotHaveAllKeys(object, [keys], [message])
       *
       * Asserts that `object` does not have at least one of the `keys` provided.
       * You can also provide a single object instead of a `keys` array and its keys
       * will be used as the expected set of keys.
       *
       *     assert.doesNotHaveAllKeys({foo: 1, bar: 2, baz: 3}, ['one', 'two', 'example']);
       *     assert.doesNotHaveAllKeys({foo: 1, bar: 2, baz: 3}, {one: 1, two: 2, example: 'foo'});
       *     assert.doesNotHaveAllKeys(new Map([[{foo: 1}, 'bar'], ['key', 'value']]), [{one: 'two'}, 'example']);
       *     assert.doesNotHaveAllKeys(new Set([{foo: 'bar'}, 'anotherKey'], [{one: 'two'}, 'example']);
       *
       * @name doesNotHaveAllKeys
       * @param {Mixed} object
       * @param {String[]} keys
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.doesNotHaveAllKeys = function (obj, keys, msg) {
        new Assertion(obj, msg, assert.doesNotHaveAllKeys, true)
          .to.not.have.all.keys(keys);
      };

      /**
       * ### .hasAnyDeepKeys(object, [keys], [message])
       *
       * Asserts that `object` has at least one of the `keys` provided.
       * Since Sets and Maps can have objects as keys you can use this assertion to perform
       * a deep comparison.
       * You can also provide a single object instead of a `keys` array and its keys
       * will be used as the expected set of keys.
       *
       *     assert.hasAnyDeepKeys(new Map([[{one: 'one'}, 'valueOne'], [1, 2]]), {one: 'one'});
       *     assert.hasAnyDeepKeys(new Map([[{one: 'one'}, 'valueOne'], [1, 2]]), [{one: 'one'}, {two: 'two'}]);
       *     assert.hasAnyDeepKeys(new Map([[{one: 'one'}, 'valueOne'], [{two: 'two'}, 'valueTwo']]), [{one: 'one'}, {two: 'two'}]);
       *     assert.hasAnyDeepKeys(new Set([{one: 'one'}, {two: 'two'}]), {one: 'one'});
       *     assert.hasAnyDeepKeys(new Set([{one: 'one'}, {two: 'two'}]), [{one: 'one'}, {three: 'three'}]);
       *     assert.hasAnyDeepKeys(new Set([{one: 'one'}, {two: 'two'}]), [{one: 'one'}, {two: 'two'}]);
       *
       * @name hasAnyDeepKeys
       * @param {Mixed} object
       * @param {Array|Object} keys
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.hasAnyDeepKeys = function (obj, keys, msg) {
        new Assertion(obj, msg, assert.hasAnyDeepKeys, true)
          .to.have.any.deep.keys(keys);
      };

     /**
       * ### .hasAllDeepKeys(object, [keys], [message])
       *
       * Asserts that `object` has all and only all of the `keys` provided.
       * Since Sets and Maps can have objects as keys you can use this assertion to perform
       * a deep comparison.
       * You can also provide a single object instead of a `keys` array and its keys
       * will be used as the expected set of keys.
       *
       *     assert.hasAllDeepKeys(new Map([[{one: 'one'}, 'valueOne']]), {one: 'one'});
       *     assert.hasAllDeepKeys(new Map([[{one: 'one'}, 'valueOne'], [{two: 'two'}, 'valueTwo']]), [{one: 'one'}, {two: 'two'}]);
       *     assert.hasAllDeepKeys(new Set([{one: 'one'}]), {one: 'one'});
       *     assert.hasAllDeepKeys(new Set([{one: 'one'}, {two: 'two'}]), [{one: 'one'}, {two: 'two'}]);
       *
       * @name hasAllDeepKeys
       * @param {Mixed} object
       * @param {Array|Object} keys
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.hasAllDeepKeys = function (obj, keys, msg) {
        new Assertion(obj, msg, assert.hasAllDeepKeys, true)
          .to.have.all.deep.keys(keys);
      };

     /**
       * ### .containsAllDeepKeys(object, [keys], [message])
       *
       * Asserts that `object` contains all of the `keys` provided.
       * Since Sets and Maps can have objects as keys you can use this assertion to perform
       * a deep comparison.
       * You can also provide a single object instead of a `keys` array and its keys
       * will be used as the expected set of keys.
       *
       *     assert.containsAllDeepKeys(new Map([[{one: 'one'}, 'valueOne'], [1, 2]]), {one: 'one'});
       *     assert.containsAllDeepKeys(new Map([[{one: 'one'}, 'valueOne'], [{two: 'two'}, 'valueTwo']]), [{one: 'one'}, {two: 'two'}]);
       *     assert.containsAllDeepKeys(new Set([{one: 'one'}, {two: 'two'}]), {one: 'one'});
       *     assert.containsAllDeepKeys(new Set([{one: 'one'}, {two: 'two'}]), [{one: 'one'}, {two: 'two'}]);
       *
       * @name containsAllDeepKeys
       * @param {Mixed} object
       * @param {Array|Object} keys
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.containsAllDeepKeys = function (obj, keys, msg) {
        new Assertion(obj, msg, assert.containsAllDeepKeys, true)
          .to.contain.all.deep.keys(keys);
      };

     /**
       * ### .doesNotHaveAnyDeepKeys(object, [keys], [message])
       *
       * Asserts that `object` has none of the `keys` provided.
       * Since Sets and Maps can have objects as keys you can use this assertion to perform
       * a deep comparison.
       * You can also provide a single object instead of a `keys` array and its keys
       * will be used as the expected set of keys.
       *
       *     assert.doesNotHaveAnyDeepKeys(new Map([[{one: 'one'}, 'valueOne'], [1, 2]]), {thisDoesNot: 'exist'});
       *     assert.doesNotHaveAnyDeepKeys(new Map([[{one: 'one'}, 'valueOne'], [{two: 'two'}, 'valueTwo']]), [{twenty: 'twenty'}, {fifty: 'fifty'}]);
       *     assert.doesNotHaveAnyDeepKeys(new Set([{one: 'one'}, {two: 'two'}]), {twenty: 'twenty'});
       *     assert.doesNotHaveAnyDeepKeys(new Set([{one: 'one'}, {two: 'two'}]), [{twenty: 'twenty'}, {fifty: 'fifty'}]);
       *
       * @name doesNotHaveAnyDeepKeys
       * @param {Mixed} object
       * @param {Array|Object} keys
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.doesNotHaveAnyDeepKeys = function (obj, keys, msg) {
        new Assertion(obj, msg, assert.doesNotHaveAnyDeepKeys, true)
          .to.not.have.any.deep.keys(keys);
      };

     /**
       * ### .doesNotHaveAllDeepKeys(object, [keys], [message])
       *
       * Asserts that `object` does not have at least one of the `keys` provided.
       * Since Sets and Maps can have objects as keys you can use this assertion to perform
       * a deep comparison.
       * You can also provide a single object instead of a `keys` array and its keys
       * will be used as the expected set of keys.
       *
       *     assert.doesNotHaveAllDeepKeys(new Map([[{one: 'one'}, 'valueOne'], [1, 2]]), {thisDoesNot: 'exist'});
       *     assert.doesNotHaveAllDeepKeys(new Map([[{one: 'one'}, 'valueOne'], [{two: 'two'}, 'valueTwo']]), [{twenty: 'twenty'}, {one: 'one'}]);
       *     assert.doesNotHaveAllDeepKeys(new Set([{one: 'one'}, {two: 'two'}]), {twenty: 'twenty'});
       *     assert.doesNotHaveAllDeepKeys(new Set([{one: 'one'}, {two: 'two'}]), [{one: 'one'}, {fifty: 'fifty'}]);
       *
       * @name doesNotHaveAllDeepKeys
       * @param {Mixed} object
       * @param {Array|Object} keys
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.doesNotHaveAllDeepKeys = function (obj, keys, msg) {
        new Assertion(obj, msg, assert.doesNotHaveAllDeepKeys, true)
          .to.not.have.all.deep.keys(keys);
      };

     /**
       * ### .throws(fn, [errorLike/string/regexp], [string/regexp], [message])
       *
       * If `errorLike` is an `Error` constructor, asserts that `fn` will throw an error that is an
       * instance of `errorLike`.
       * If `errorLike` is an `Error` instance, asserts that the error thrown is the same
       * instance as `errorLike`.
       * If `errMsgMatcher` is provided, it also asserts that the error thrown will have a
       * message matching `errMsgMatcher`.
       *
       *     assert.throws(fn, 'Error thrown must have this msg');
       *     assert.throws(fn, /Error thrown must have a msg that matches this/);
       *     assert.throws(fn, ReferenceError);
       *     assert.throws(fn, errorInstance);
       *     assert.throws(fn, ReferenceError, 'Error thrown must be a ReferenceError and have this msg');
       *     assert.throws(fn, errorInstance, 'Error thrown must be the same errorInstance and have this msg');
       *     assert.throws(fn, ReferenceError, /Error thrown must be a ReferenceError and match this/);
       *     assert.throws(fn, errorInstance, /Error thrown must be the same errorInstance and match this/);
       *
       * @name throws
       * @alias throw
       * @alias Throw
       * @param {Function} fn
       * @param {ErrorConstructor|Error} errorLike
       * @param {RegExp|String} errMsgMatcher
       * @param {String} message
       * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error#Error_types
       * @namespace Assert
       * @api public
       */

      assert.throws = function (fn, errorLike, errMsgMatcher, msg) {
        if ('string' === typeof errorLike || errorLike instanceof RegExp) {
          errMsgMatcher = errorLike;
          errorLike = null;
        }

        var assertErr = new Assertion(fn, msg, assert.throws, true)
          .to.throw(errorLike, errMsgMatcher);
        return flag(assertErr, 'object');
      };

      /**
       * ### .doesNotThrow(fn, [errorLike/string/regexp], [string/regexp], [message])
       *
       * If `errorLike` is an `Error` constructor, asserts that `fn` will _not_ throw an error that is an
       * instance of `errorLike`.
       * If `errorLike` is an `Error` instance, asserts that the error thrown is _not_ the same
       * instance as `errorLike`.
       * If `errMsgMatcher` is provided, it also asserts that the error thrown will _not_ have a
       * message matching `errMsgMatcher`.
       *
       *     assert.doesNotThrow(fn, 'Any Error thrown must not have this message');
       *     assert.doesNotThrow(fn, /Any Error thrown must not match this/);
       *     assert.doesNotThrow(fn, Error);
       *     assert.doesNotThrow(fn, errorInstance);
       *     assert.doesNotThrow(fn, Error, 'Error must not have this message');
       *     assert.doesNotThrow(fn, errorInstance, 'Error must not have this message');
       *     assert.doesNotThrow(fn, Error, /Error must not match this/);
       *     assert.doesNotThrow(fn, errorInstance, /Error must not match this/);
       *
       * @name doesNotThrow
       * @param {Function} fn
       * @param {ErrorConstructor} errorLike
       * @param {RegExp|String} errMsgMatcher
       * @param {String} message
       * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error#Error_types
       * @namespace Assert
       * @api public
       */

      assert.doesNotThrow = function (fn, errorLike, errMsgMatcher, msg) {
        if ('string' === typeof errorLike || errorLike instanceof RegExp) {
          errMsgMatcher = errorLike;
          errorLike = null;
        }

        new Assertion(fn, msg, assert.doesNotThrow, true)
          .to.not.throw(errorLike, errMsgMatcher);
      };

      /**
       * ### .operator(val1, operator, val2, [message])
       *
       * Compares two values using `operator`.
       *
       *     assert.operator(1, '<', 2, 'everything is ok');
       *     assert.operator(1, '>', 2, 'this will fail');
       *
       * @name operator
       * @param {Mixed} val1
       * @param {String} operator
       * @param {Mixed} val2
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.operator = function (val, operator, val2, msg) {
        var ok;
        switch(operator) {
          case '==':
            ok = val == val2;
            break;
          case '===':
            ok = val === val2;
            break;
          case '>':
            ok = val > val2;
            break;
          case '>=':
            ok = val >= val2;
            break;
          case '<':
            ok = val < val2;
            break;
          case '<=':
            ok = val <= val2;
            break;
          case '!=':
            ok = val != val2;
            break;
          case '!==':
            ok = val !== val2;
            break;
          default:
            msg = msg ? msg + ': ' : msg;
            throw new chai.AssertionError(
              msg + 'Invalid operator "' + operator + '"',
              undefined,
              assert.operator
            );
        }
        var test = new Assertion(ok, msg, assert.operator, true);
        test.assert(
            true === flag(test, 'object')
          , 'expected ' + util.inspect(val) + ' to be ' + operator + ' ' + util.inspect(val2)
          , 'expected ' + util.inspect(val) + ' to not be ' + operator + ' ' + util.inspect(val2) );
      };

      /**
       * ### .closeTo(actual, expected, delta, [message])
       *
       * Asserts that the target is equal `expected`, to within a +/- `delta` range.
       *
       *     assert.closeTo(1.5, 1, 0.5, 'numbers are close');
       *
       * @name closeTo
       * @param {Number} actual
       * @param {Number} expected
       * @param {Number} delta
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.closeTo = function (act, exp, delta, msg) {
        new Assertion(act, msg, assert.closeTo, true).to.be.closeTo(exp, delta);
      };

      /**
       * ### .approximately(actual, expected, delta, [message])
       *
       * Asserts that the target is equal `expected`, to within a +/- `delta` range.
       *
       *     assert.approximately(1.5, 1, 0.5, 'numbers are close');
       *
       * @name approximately
       * @param {Number} actual
       * @param {Number} expected
       * @param {Number} delta
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.approximately = function (act, exp, delta, msg) {
        new Assertion(act, msg, assert.approximately, true)
          .to.be.approximately(exp, delta);
      };

      /**
       * ### .sameMembers(set1, set2, [message])
       *
       * Asserts that `set1` and `set2` have the same members in any order. Uses a
       * strict equality check (===).
       *
       *     assert.sameMembers([ 1, 2, 3 ], [ 2, 1, 3 ], 'same members');
       *
       * @name sameMembers
       * @param {Array} set1
       * @param {Array} set2
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.sameMembers = function (set1, set2, msg) {
        new Assertion(set1, msg, assert.sameMembers, true)
          .to.have.same.members(set2);
      };

      /**
       * ### .notSameMembers(set1, set2, [message])
       *
       * Asserts that `set1` and `set2` don't have the same members in any order.
       * Uses a strict equality check (===).
       *
       *     assert.notSameMembers([ 1, 2, 3 ], [ 5, 1, 3 ], 'not same members');
       *
       * @name notSameMembers
       * @param {Array} set1
       * @param {Array} set2
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.notSameMembers = function (set1, set2, msg) {
        new Assertion(set1, msg, assert.notSameMembers, true)
          .to.not.have.same.members(set2);
      };

      /**
       * ### .sameDeepMembers(set1, set2, [message])
       *
       * Asserts that `set1` and `set2` have the same members in any order. Uses a
       * deep equality check.
       *
       *     assert.sameDeepMembers([ { a: 1 }, { b: 2 }, { c: 3 } ], [{ b: 2 }, { a: 1 }, { c: 3 }], 'same deep members');
       *
       * @name sameDeepMembers
       * @param {Array} set1
       * @param {Array} set2
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.sameDeepMembers = function (set1, set2, msg) {
        new Assertion(set1, msg, assert.sameDeepMembers, true)
          .to.have.same.deep.members(set2);
      };

      /**
       * ### .notSameDeepMembers(set1, set2, [message])
       *
       * Asserts that `set1` and `set2` don't have the same members in any order.
       * Uses a deep equality check.
       *
       *     assert.notSameDeepMembers([ { a: 1 }, { b: 2 }, { c: 3 } ], [{ b: 2 }, { a: 1 }, { f: 5 }], 'not same deep members');
       *
       * @name notSameDeepMembers
       * @param {Array} set1
       * @param {Array} set2
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.notSameDeepMembers = function (set1, set2, msg) {
        new Assertion(set1, msg, assert.notSameDeepMembers, true)
          .to.not.have.same.deep.members(set2);
      };

      /**
       * ### .sameOrderedMembers(set1, set2, [message])
       *
       * Asserts that `set1` and `set2` have the same members in the same order.
       * Uses a strict equality check (===).
       *
       *     assert.sameOrderedMembers([ 1, 2, 3 ], [ 1, 2, 3 ], 'same ordered members');
       *
       * @name sameOrderedMembers
       * @param {Array} set1
       * @param {Array} set2
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.sameOrderedMembers = function (set1, set2, msg) {
        new Assertion(set1, msg, assert.sameOrderedMembers, true)
          .to.have.same.ordered.members(set2);
      };

      /**
       * ### .notSameOrderedMembers(set1, set2, [message])
       *
       * Asserts that `set1` and `set2` don't have the same members in the same
       * order. Uses a strict equality check (===).
       *
       *     assert.notSameOrderedMembers([ 1, 2, 3 ], [ 2, 1, 3 ], 'not same ordered members');
       *
       * @name notSameOrderedMembers
       * @param {Array} set1
       * @param {Array} set2
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.notSameOrderedMembers = function (set1, set2, msg) {
        new Assertion(set1, msg, assert.notSameOrderedMembers, true)
          .to.not.have.same.ordered.members(set2);
      };

      /**
       * ### .sameDeepOrderedMembers(set1, set2, [message])
       *
       * Asserts that `set1` and `set2` have the same members in the same order.
       * Uses a deep equality check.
       *
       *     assert.sameDeepOrderedMembers([ { a: 1 }, { b: 2 }, { c: 3 } ], [ { a: 1 }, { b: 2 }, { c: 3 } ], 'same deep ordered members');
       *
       * @name sameDeepOrderedMembers
       * @param {Array} set1
       * @param {Array} set2
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.sameDeepOrderedMembers = function (set1, set2, msg) {
        new Assertion(set1, msg, assert.sameDeepOrderedMembers, true)
          .to.have.same.deep.ordered.members(set2);
      };

      /**
       * ### .notSameDeepOrderedMembers(set1, set2, [message])
       *
       * Asserts that `set1` and `set2` don't have the same members in the same
       * order. Uses a deep equality check.
       *
       *     assert.notSameDeepOrderedMembers([ { a: 1 }, { b: 2 }, { c: 3 } ], [ { a: 1 }, { b: 2 }, { z: 5 } ], 'not same deep ordered members');
       *     assert.notSameDeepOrderedMembers([ { a: 1 }, { b: 2 }, { c: 3 } ], [ { b: 2 }, { a: 1 }, { c: 3 } ], 'not same deep ordered members');
       *
       * @name notSameDeepOrderedMembers
       * @param {Array} set1
       * @param {Array} set2
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.notSameDeepOrderedMembers = function (set1, set2, msg) {
        new Assertion(set1, msg, assert.notSameDeepOrderedMembers, true)
          .to.not.have.same.deep.ordered.members(set2);
      };

      /**
       * ### .includeMembers(superset, subset, [message])
       *
       * Asserts that `subset` is included in `superset` in any order. Uses a
       * strict equality check (===). Duplicates are ignored.
       *
       *     assert.includeMembers([ 1, 2, 3 ], [ 2, 1, 2 ], 'include members');
       *
       * @name includeMembers
       * @param {Array} superset
       * @param {Array} subset
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.includeMembers = function (superset, subset, msg) {
        new Assertion(superset, msg, assert.includeMembers, true)
          .to.include.members(subset);
      };

      /**
       * ### .notIncludeMembers(superset, subset, [message])
       *
       * Asserts that `subset` isn't included in `superset` in any order. Uses a
       * strict equality check (===). Duplicates are ignored.
       *
       *     assert.notIncludeMembers([ 1, 2, 3 ], [ 5, 1 ], 'not include members');
       *
       * @name notIncludeMembers
       * @param {Array} superset
       * @param {Array} subset
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.notIncludeMembers = function (superset, subset, msg) {
        new Assertion(superset, msg, assert.notIncludeMembers, true)
          .to.not.include.members(subset);
      };

      /**
       * ### .includeDeepMembers(superset, subset, [message])
       *
       * Asserts that `subset` is included in `superset` in any order. Uses a deep
       * equality check. Duplicates are ignored.
       *
       *     assert.includeDeepMembers([ { a: 1 }, { b: 2 }, { c: 3 } ], [ { b: 2 }, { a: 1 }, { b: 2 } ], 'include deep members');
       *
       * @name includeDeepMembers
       * @param {Array} superset
       * @param {Array} subset
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.includeDeepMembers = function (superset, subset, msg) {
        new Assertion(superset, msg, assert.includeDeepMembers, true)
          .to.include.deep.members(subset);
      };

      /**
       * ### .notIncludeDeepMembers(superset, subset, [message])
       *
       * Asserts that `subset` isn't included in `superset` in any order. Uses a
       * deep equality check. Duplicates are ignored.
       *
       *     assert.notIncludeDeepMembers([ { a: 1 }, { b: 2 }, { c: 3 } ], [ { b: 2 }, { f: 5 } ], 'not include deep members');
       *
       * @name notIncludeDeepMembers
       * @param {Array} superset
       * @param {Array} subset
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.notIncludeDeepMembers = function (superset, subset, msg) {
        new Assertion(superset, msg, assert.notIncludeDeepMembers, true)
          .to.not.include.deep.members(subset);
      };

      /**
       * ### .includeOrderedMembers(superset, subset, [message])
       *
       * Asserts that `subset` is included in `superset` in the same order
       * beginning with the first element in `superset`. Uses a strict equality
       * check (===).
       *
       *     assert.includeOrderedMembers([ 1, 2, 3 ], [ 1, 2 ], 'include ordered members');
       *
       * @name includeOrderedMembers
       * @param {Array} superset
       * @param {Array} subset
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.includeOrderedMembers = function (superset, subset, msg) {
        new Assertion(superset, msg, assert.includeOrderedMembers, true)
          .to.include.ordered.members(subset);
      };

      /**
       * ### .notIncludeOrderedMembers(superset, subset, [message])
       *
       * Asserts that `subset` isn't included in `superset` in the same order
       * beginning with the first element in `superset`. Uses a strict equality
       * check (===).
       *
       *     assert.notIncludeOrderedMembers([ 1, 2, 3 ], [ 2, 1 ], 'not include ordered members');
       *     assert.notIncludeOrderedMembers([ 1, 2, 3 ], [ 2, 3 ], 'not include ordered members');
       *
       * @name notIncludeOrderedMembers
       * @param {Array} superset
       * @param {Array} subset
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.notIncludeOrderedMembers = function (superset, subset, msg) {
        new Assertion(superset, msg, assert.notIncludeOrderedMembers, true)
          .to.not.include.ordered.members(subset);
      };

      /**
       * ### .includeDeepOrderedMembers(superset, subset, [message])
       *
       * Asserts that `subset` is included in `superset` in the same order
       * beginning with the first element in `superset`. Uses a deep equality
       * check.
       *
       *     assert.includeDeepOrderedMembers([ { a: 1 }, { b: 2 }, { c: 3 } ], [ { a: 1 }, { b: 2 } ], 'include deep ordered members');
       *
       * @name includeDeepOrderedMembers
       * @param {Array} superset
       * @param {Array} subset
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.includeDeepOrderedMembers = function (superset, subset, msg) {
        new Assertion(superset, msg, assert.includeDeepOrderedMembers, true)
          .to.include.deep.ordered.members(subset);
      };

      /**
       * ### .notIncludeDeepOrderedMembers(superset, subset, [message])
       *
       * Asserts that `subset` isn't included in `superset` in the same order
       * beginning with the first element in `superset`. Uses a deep equality
       * check.
       *
       *     assert.notIncludeDeepOrderedMembers([ { a: 1 }, { b: 2 }, { c: 3 } ], [ { a: 1 }, { f: 5 } ], 'not include deep ordered members');
       *     assert.notIncludeDeepOrderedMembers([ { a: 1 }, { b: 2 }, { c: 3 } ], [ { b: 2 }, { a: 1 } ], 'not include deep ordered members');
       *     assert.notIncludeDeepOrderedMembers([ { a: 1 }, { b: 2 }, { c: 3 } ], [ { b: 2 }, { c: 3 } ], 'not include deep ordered members');
       *
       * @name notIncludeDeepOrderedMembers
       * @param {Array} superset
       * @param {Array} subset
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.notIncludeDeepOrderedMembers = function (superset, subset, msg) {
        new Assertion(superset, msg, assert.notIncludeDeepOrderedMembers, true)
          .to.not.include.deep.ordered.members(subset);
      };

      /**
       * ### .oneOf(inList, list, [message])
       *
       * Asserts that non-object, non-array value `inList` appears in the flat array `list`.
       *
       *     assert.oneOf(1, [ 2, 1 ], 'Not found in list');
       *
       * @name oneOf
       * @param {*} inList
       * @param {Array<*>} list
       * @param {String} message
       * @namespace Assert
       * @api public
       */

      assert.oneOf = function (inList, list, msg) {
        new Assertion(inList, msg, assert.oneOf, true).to.be.oneOf(list);
      };

      /**
       * ### .changes(function, object, property, [message])
       *
       * Asserts that a function changes the value of a property.
       *
       *     var obj = { val: 10 };
       *     var fn = function() { obj.val = 22 };
       *     assert.changes(fn, obj, 'val');
       *
       * @name changes
       * @param {Function} modifier function
       * @param {Object} object or getter function
       * @param {String} property name _optional_
       * @param {String} message _optional_
       * @namespace Assert
       * @api public
       */

      assert.changes = function (fn, obj, prop, msg) {
        if (arguments.length === 3 && typeof obj === 'function') {
          msg = prop;
          prop = null;
        }

        new Assertion(fn, msg, assert.changes, true).to.change(obj, prop);
      };

       /**
       * ### .changesBy(function, object, property, delta, [message])
       *
       * Asserts that a function changes the value of a property by an amount (delta).
       *
       *     var obj = { val: 10 };
       *     var fn = function() { obj.val += 2 };
       *     assert.changesBy(fn, obj, 'val', 2);
       *
       * @name changesBy
       * @param {Function} modifier function
       * @param {Object} object or getter function
       * @param {String} property name _optional_
       * @param {Number} change amount (delta)
       * @param {String} message _optional_
       * @namespace Assert
       * @api public
       */

      assert.changesBy = function (fn, obj, prop, delta, msg) {
        if (arguments.length === 4 && typeof obj === 'function') {
          var tmpMsg = delta;
          delta = prop;
          msg = tmpMsg;
        } else if (arguments.length === 3) {
          delta = prop;
          prop = null;
        }

        new Assertion(fn, msg, assert.changesBy, true)
          .to.change(obj, prop).by(delta);
      };

       /**
       * ### .doesNotChange(function, object, property, [message])
       *
       * Asserts that a function does not change the value of a property.
       *
       *     var obj = { val: 10 };
       *     var fn = function() { console.log('foo'); };
       *     assert.doesNotChange(fn, obj, 'val');
       *
       * @name doesNotChange
       * @param {Function} modifier function
       * @param {Object} object or getter function
       * @param {String} property name _optional_
       * @param {String} message _optional_
       * @namespace Assert
       * @api public
       */

      assert.doesNotChange = function (fn, obj, prop, msg) {
        if (arguments.length === 3 && typeof obj === 'function') {
          msg = prop;
          prop = null;
        }

        return new Assertion(fn, msg, assert.doesNotChange, true)
          .to.not.change(obj, prop);
      };

      /**
       * ### .changesButNotBy(function, object, property, delta, [message])
       *
       * Asserts that a function does not change the value of a property or of a function's return value by an amount (delta)
       *
       *     var obj = { val: 10 };
       *     var fn = function() { obj.val += 10 };
       *     assert.changesButNotBy(fn, obj, 'val', 5);
       *
       * @name changesButNotBy
       * @param {Function} modifier function
       * @param {Object} object or getter function
       * @param {String} property name _optional_
       * @param {Number} change amount (delta)
       * @param {String} message _optional_
       * @namespace Assert
       * @api public
       */

      assert.changesButNotBy = function (fn, obj, prop, delta, msg) {
        if (arguments.length === 4 && typeof obj === 'function') {
          var tmpMsg = delta;
          delta = prop;
          msg = tmpMsg;
        } else if (arguments.length === 3) {
          delta = prop;
          prop = null;
        }

        new Assertion(fn, msg, assert.changesButNotBy, true)
          .to.change(obj, prop).but.not.by(delta);
      };

      /**
       * ### .increases(function, object, property, [message])
       *
       * Asserts that a function increases a numeric object property.
       *
       *     var obj = { val: 10 };
       *     var fn = function() { obj.val = 13 };
       *     assert.increases(fn, obj, 'val');
       *
       * @name increases
       * @param {Function} modifier function
       * @param {Object} object or getter function
       * @param {String} property name _optional_
       * @param {String} message _optional_
       * @namespace Assert
       * @api public
       */

      assert.increases = function (fn, obj, prop, msg) {
        if (arguments.length === 3 && typeof obj === 'function') {
          msg = prop;
          prop = null;
        }

        return new Assertion(fn, msg, assert.increases, true)
          .to.increase(obj, prop);
      };

      /**
       * ### .increasesBy(function, object, property, delta, [message])
       *
       * Asserts that a function increases a numeric object property or a function's return value by an amount (delta).
       *
       *     var obj = { val: 10 };
       *     var fn = function() { obj.val += 10 };
       *     assert.increasesBy(fn, obj, 'val', 10);
       *
       * @name increasesBy
       * @param {Function} modifier function
       * @param {Object} object or getter function
       * @param {String} property name _optional_
       * @param {Number} change amount (delta)
       * @param {String} message _optional_
       * @namespace Assert
       * @api public
       */

      assert.increasesBy = function (fn, obj, prop, delta, msg) {
        if (arguments.length === 4 && typeof obj === 'function') {
          var tmpMsg = delta;
          delta = prop;
          msg = tmpMsg;
        } else if (arguments.length === 3) {
          delta = prop;
          prop = null;
        }

        new Assertion(fn, msg, assert.increasesBy, true)
          .to.increase(obj, prop).by(delta);
      };

      /**
       * ### .doesNotIncrease(function, object, property, [message])
       *
       * Asserts that a function does not increase a numeric object property.
       *
       *     var obj = { val: 10 };
       *     var fn = function() { obj.val = 8 };
       *     assert.doesNotIncrease(fn, obj, 'val');
       *
       * @name doesNotIncrease
       * @param {Function} modifier function
       * @param {Object} object or getter function
       * @param {String} property name _optional_
       * @param {String} message _optional_
       * @namespace Assert
       * @api public
       */

      assert.doesNotIncrease = function (fn, obj, prop, msg) {
        if (arguments.length === 3 && typeof obj === 'function') {
          msg = prop;
          prop = null;
        }

        return new Assertion(fn, msg, assert.doesNotIncrease, true)
          .to.not.increase(obj, prop);
      };

      /**
       * ### .increasesButNotBy(function, object, property, delta, [message])
       *
       * Asserts that a function does not increase a numeric object property or function's return value by an amount (delta).
       *
       *     var obj = { val: 10 };
       *     var fn = function() { obj.val = 15 };
       *     assert.increasesButNotBy(fn, obj, 'val', 10);
       *
       * @name increasesButNotBy
       * @param {Function} modifier function
       * @param {Object} object or getter function
       * @param {String} property name _optional_
       * @param {Number} change amount (delta)
       * @param {String} message _optional_
       * @namespace Assert
       * @api public
       */

      assert.increasesButNotBy = function (fn, obj, prop, delta, msg) {
        if (arguments.length === 4 && typeof obj === 'function') {
          var tmpMsg = delta;
          delta = prop;
          msg = tmpMsg;
        } else if (arguments.length === 3) {
          delta = prop;
          prop = null;
        }

        new Assertion(fn, msg, assert.increasesButNotBy, true)
          .to.increase(obj, prop).but.not.by(delta);
      };

      /**
       * ### .decreases(function, object, property, [message])
       *
       * Asserts that a function decreases a numeric object property.
       *
       *     var obj = { val: 10 };
       *     var fn = function() { obj.val = 5 };
       *     assert.decreases(fn, obj, 'val');
       *
       * @name decreases
       * @param {Function} modifier function
       * @param {Object} object or getter function
       * @param {String} property name _optional_
       * @param {String} message _optional_
       * @namespace Assert
       * @api public
       */

      assert.decreases = function (fn, obj, prop, msg) {
        if (arguments.length === 3 && typeof obj === 'function') {
          msg = prop;
          prop = null;
        }

        return new Assertion(fn, msg, assert.decreases, true)
          .to.decrease(obj, prop);
      };

      /**
       * ### .decreasesBy(function, object, property, delta, [message])
       *
       * Asserts that a function decreases a numeric object property or a function's return value by an amount (delta)
       *
       *     var obj = { val: 10 };
       *     var fn = function() { obj.val -= 5 };
       *     assert.decreasesBy(fn, obj, 'val', 5);
       *
       * @name decreasesBy
       * @param {Function} modifier function
       * @param {Object} object or getter function
       * @param {String} property name _optional_
       * @param {Number} change amount (delta)
       * @param {String} message _optional_
       * @namespace Assert
       * @api public
       */

      assert.decreasesBy = function (fn, obj, prop, delta, msg) {
        if (arguments.length === 4 && typeof obj === 'function') {
          var tmpMsg = delta;
          delta = prop;
          msg = tmpMsg;
        } else if (arguments.length === 3) {
          delta = prop;
          prop = null;
        }

        new Assertion(fn, msg, assert.decreasesBy, true)
          .to.decrease(obj, prop).by(delta);
      };

      /**
       * ### .doesNotDecrease(function, object, property, [message])
       *
       * Asserts that a function does not decreases a numeric object property.
       *
       *     var obj = { val: 10 };
       *     var fn = function() { obj.val = 15 };
       *     assert.doesNotDecrease(fn, obj, 'val');
       *
       * @name doesNotDecrease
       * @param {Function} modifier function
       * @param {Object} object or getter function
       * @param {String} property name _optional_
       * @param {String} message _optional_
       * @namespace Assert
       * @api public
       */

      assert.doesNotDecrease = function (fn, obj, prop, msg) {
        if (arguments.length === 3 && typeof obj === 'function') {
          msg = prop;
          prop = null;
        }

        return new Assertion(fn, msg, assert.doesNotDecrease, true)
          .to.not.decrease(obj, prop);
      };

      /**
       * ### .doesNotDecreaseBy(function, object, property, delta, [message])
       *
       * Asserts that a function does not decreases a numeric object property or a function's return value by an amount (delta)
       *
       *     var obj = { val: 10 };
       *     var fn = function() { obj.val = 5 };
       *     assert.doesNotDecreaseBy(fn, obj, 'val', 1);
       *
       * @name doesNotDecreaseBy
       * @param {Function} modifier function
       * @param {Object} object or getter function
       * @param {String} property name _optional_
       * @param {Number} change amount (delta)
       * @param {String} message _optional_
       * @namespace Assert
       * @api public
       */

      assert.doesNotDecreaseBy = function (fn, obj, prop, delta, msg) {
        if (arguments.length === 4 && typeof obj === 'function') {
          var tmpMsg = delta;
          delta = prop;
          msg = tmpMsg;
        } else if (arguments.length === 3) {
          delta = prop;
          prop = null;
        }

        return new Assertion(fn, msg, assert.doesNotDecreaseBy, true)
          .to.not.decrease(obj, prop).by(delta);
      };

      /**
       * ### .decreasesButNotBy(function, object, property, delta, [message])
       *
       * Asserts that a function does not decreases a numeric object property or a function's return value by an amount (delta)
       *
       *     var obj = { val: 10 };
       *     var fn = function() { obj.val = 5 };
       *     assert.decreasesButNotBy(fn, obj, 'val', 1);
       *
       * @name decreasesButNotBy
       * @param {Function} modifier function
       * @param {Object} object or getter function
       * @param {String} property name _optional_
       * @param {Number} change amount (delta)
       * @param {String} message _optional_
       * @namespace Assert
       * @api public
       */

      assert.decreasesButNotBy = function (fn, obj, prop, delta, msg) {
        if (arguments.length === 4 && typeof obj === 'function') {
          var tmpMsg = delta;
          delta = prop;
          msg = tmpMsg;
        } else if (arguments.length === 3) {
          delta = prop;
          prop = null;
        }

        new Assertion(fn, msg, assert.decreasesButNotBy, true)
          .to.decrease(obj, prop).but.not.by(delta);
      };

      /*!
       * ### .ifError(object)
       *
       * Asserts if value is not a false value, and throws if it is a true value.
       * This is added to allow for chai to be a drop-in replacement for Node's
       * assert class.
       *
       *     var err = new Error('I am a custom error');
       *     assert.ifError(err); // Rethrows err!
       *
       * @name ifError
       * @param {Object} object
       * @namespace Assert
       * @api public
       */

      assert.ifError = function (val) {
        if (val) {
          throw(val);
        }
      };

      /**
       * ### .isExtensible(object)
       *
       * Asserts that `object` is extensible (can have new properties added to it).
       *
       *     assert.isExtensible({});
       *
       * @name isExtensible
       * @alias extensible
       * @param {Object} object
       * @param {String} message _optional_
       * @namespace Assert
       * @api public
       */

      assert.isExtensible = function (obj, msg) {
        new Assertion(obj, msg, assert.isExtensible, true).to.be.extensible;
      };

      /**
       * ### .isNotExtensible(object)
       *
       * Asserts that `object` is _not_ extensible.
       *
       *     var nonExtensibleObject = Object.preventExtensions({});
       *     var sealedObject = Object.seal({});
       *     var frozenObject = Object.freeze({});
       *
       *     assert.isNotExtensible(nonExtensibleObject);
       *     assert.isNotExtensible(sealedObject);
       *     assert.isNotExtensible(frozenObject);
       *
       * @name isNotExtensible
       * @alias notExtensible
       * @param {Object} object
       * @param {String} message _optional_
       * @namespace Assert
       * @api public
       */

      assert.isNotExtensible = function (obj, msg) {
        new Assertion(obj, msg, assert.isNotExtensible, true).to.not.be.extensible;
      };

      /**
       * ### .isSealed(object)
       *
       * Asserts that `object` is sealed (cannot have new properties added to it
       * and its existing properties cannot be removed).
       *
       *     var sealedObject = Object.seal({});
       *     var frozenObject = Object.seal({});
       *
       *     assert.isSealed(sealedObject);
       *     assert.isSealed(frozenObject);
       *
       * @name isSealed
       * @alias sealed
       * @param {Object} object
       * @param {String} message _optional_
       * @namespace Assert
       * @api public
       */

      assert.isSealed = function (obj, msg) {
        new Assertion(obj, msg, assert.isSealed, true).to.be.sealed;
      };

      /**
       * ### .isNotSealed(object)
       *
       * Asserts that `object` is _not_ sealed.
       *
       *     assert.isNotSealed({});
       *
       * @name isNotSealed
       * @alias notSealed
       * @param {Object} object
       * @param {String} message _optional_
       * @namespace Assert
       * @api public
       */

      assert.isNotSealed = function (obj, msg) {
        new Assertion(obj, msg, assert.isNotSealed, true).to.not.be.sealed;
      };

      /**
       * ### .isFrozen(object)
       *
       * Asserts that `object` is frozen (cannot have new properties added to it
       * and its existing properties cannot be modified).
       *
       *     var frozenObject = Object.freeze({});
       *     assert.frozen(frozenObject);
       *
       * @name isFrozen
       * @alias frozen
       * @param {Object} object
       * @param {String} message _optional_
       * @namespace Assert
       * @api public
       */

      assert.isFrozen = function (obj, msg) {
        new Assertion(obj, msg, assert.isFrozen, true).to.be.frozen;
      };

      /**
       * ### .isNotFrozen(object)
       *
       * Asserts that `object` is _not_ frozen.
       *
       *     assert.isNotFrozen({});
       *
       * @name isNotFrozen
       * @alias notFrozen
       * @param {Object} object
       * @param {String} message _optional_
       * @namespace Assert
       * @api public
       */

      assert.isNotFrozen = function (obj, msg) {
        new Assertion(obj, msg, assert.isNotFrozen, true).to.not.be.frozen;
      };

      /**
       * ### .isEmpty(target)
       *
       * Asserts that the target does not contain any values.
       * For arrays and strings, it checks the `length` property.
       * For `Map` and `Set` instances, it checks the `size` property.
       * For non-function objects, it gets the count of own
       * enumerable string keys.
       *
       *     assert.isEmpty([]);
       *     assert.isEmpty('');
       *     assert.isEmpty(new Map);
       *     assert.isEmpty({});
       *
       * @name isEmpty
       * @alias empty
       * @param {Object|Array|String|Map|Set} target
       * @param {String} message _optional_
       * @namespace Assert
       * @api public
       */

      assert.isEmpty = function(val, msg) {
        new Assertion(val, msg, assert.isEmpty, true).to.be.empty;
      };

      /**
       * ### .isNotEmpty(target)
       *
       * Asserts that the target contains values.
       * For arrays and strings, it checks the `length` property.
       * For `Map` and `Set` instances, it checks the `size` property.
       * For non-function objects, it gets the count of own
       * enumerable string keys.
       *
       *     assert.isNotEmpty([1, 2]);
       *     assert.isNotEmpty('34');
       *     assert.isNotEmpty(new Set([5, 6]));
       *     assert.isNotEmpty({ key: 7 });
       *
       * @name isNotEmpty
       * @alias notEmpty
       * @param {Object|Array|String|Map|Set} target
       * @param {String} message _optional_
       * @namespace Assert
       * @api public
       */

      assert.isNotEmpty = function(val, msg) {
        new Assertion(val, msg, assert.isNotEmpty, true).to.not.be.empty;
      };

      /*!
       * Aliases.
       */

      (function alias(name, as){
        assert[as] = assert[name];
        return alias;
      })
      ('isOk', 'ok')
      ('isNotOk', 'notOk')
      ('throws', 'throw')
      ('throws', 'Throw')
      ('isExtensible', 'extensible')
      ('isNotExtensible', 'notExtensible')
      ('isSealed', 'sealed')
      ('isNotSealed', 'notSealed')
      ('isFrozen', 'frozen')
      ('isNotFrozen', 'notFrozen')
      ('isEmpty', 'empty')
      ('isNotEmpty', 'notEmpty');
    };

    /*!
     * chai
     * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
     * MIT Licensed
     */

    (function (exports) {
    var used = [];

    /*!
     * Chai version
     */

    exports.version = '4.3.3';

    /*!
     * Assertion Error
     */

    exports.AssertionError = assertionError;

    /*!
     * Utils for plugins (not exported)
     */

    var util = utils;

    /**
     * # .use(function)
     *
     * Provides a way to extend the internals of Chai.
     *
     * @param {Function}
     * @returns {this} for chaining
     * @api public
     */

    exports.use = function (fn) {
      if (!~used.indexOf(fn)) {
        fn(exports, util);
        used.push(fn);
      }

      return exports;
    };

    /*!
     * Utility Functions
     */

    exports.util = util;

    /*!
     * Configuration
     */

    var config = config$5;
    exports.config = config;

    /*!
     * Primary `Assertion` prototype
     */

    var assertion$1 = assertion;
    exports.use(assertion$1);

    /*!
     * Core Assertions
     */

    var core = assertions;
    exports.use(core);

    /*!
     * Expect interface
     */

    var expect = expect$1;
    exports.use(expect);

    /*!
     * Should interface
     */

    var should$1 = should;
    exports.use(should$1);

    /*!
     * Assert interface
     */

    var assert$1 = assert;
    exports.use(assert$1);
    }(chai$7));

    var chai = chai$7;

    const expect = chai.expect;
    chai.version;
    chai.Assertion;
    chai.AssertionError;
    chai.util;
    chai.config;
    chai.use;
    chai.should;
    chai.assert;
    chai.core;

    function arc(ctx) {

        // Draw shapes
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 3; j++) {
                ctx.beginPath();
                var x = 25 + j * 50;               // x coordinate
                var y = 25 + i * 50;               // y coordinate
                var radius = 20;                    // Arc radius
                var startAngle = 0;                     // Starting point on circle
                var endAngle = Math.PI + (Math.PI * j) / 2; // End point on circle
                var clockwise = i % 2 == 0 ? false : true; // clockwise or anticlockwise

                ctx.arc(x, y, radius, startAngle, endAngle, clockwise);

                if (i > 1) {
                    ctx.fill();
                } else {
                    ctx.stroke();
                }
            }
        }
        
    }

    function arcTo$1(ctx) {
        ctx.beginPath();
        ctx.moveTo(150, 20);
        ctx.arcTo(150, 100, 50, 20, 30);
        ctx.stroke();

        ctx.fillStyle = 'blue';
        // base point
        ctx.fillRect(150, 20, 10, 10);

        ctx.fillStyle = 'red';
        // control point one
        ctx.fillRect(150, 100, 10, 10);
        // control point two
        ctx.fillRect(50, 20, 10, 10);
    }

    function arcTo(ctx) {
        ctx.beginPath();
        ctx.moveTo(100, 225);             // P0
        ctx.arcTo(300, 25, 500, 225, 75); // P1, P2 and the radius
        ctx.lineTo(500, 225);             // P2
        ctx.stroke();
    }

    function arcToScaled(ctx) {
      ctx.scale(2, 0.5);
      ctx.beginPath();
      ctx.moveTo(100, 50);
      ctx.arcTo(150, 50, 150, 100, 50);
      ctx.arcTo(150, 150, 100, 150, 50);
      ctx.arcTo(50, 150, 50, 100, 50);
      ctx.arcTo(50, 50, 100, 50, 50);

      // Reset the scale before we stroke since SVG stroke is not scaled.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.stroke();
    }

    function emptyArc(ctx) {

        // Draw shapes
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 3; j++) {
                ctx.beginPath();
                ctx.arc(100, 100, 100, Math.PI, Math.PI);
                ctx.fill();
            }
        }
        
    }

    function ellipse(ctx) {
        // Draw shapes
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 3; j++) {
                ctx.beginPath();
                var x = 25 + j * 50;               // x coordinate
                var y = 25 + i * 50;               // y coordinate
                var radiusX = 20;                  // Arc radius
                var radiusY = 10;                  // Arc radius
                var rotation = Math.PI + (Math.PI * (i+j)) / 8;
                var startAngle = 0;                     // Starting point on circle
                var endAngle = Math.PI + (Math.PI * j) / 2; // End point on circle
                var clockwise = i % 2 == 0 ? false : true; // clockwise or anticlockwise

                ctx.ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, clockwise);

                if (i > 1) {
                    ctx.fill();
                } else {
                    ctx.stroke();
                }
            }
        }
      
    }

    function ellipse2(ctx) {
        // Draw a cylinder using ellipses and lines.
        var w = 100, h = 100, rx = 50, ry = 10;
        var scaleX = 1.5, scaleY = 1.2;

        ctx.rotate(Math.PI / 10);
        ctx.scale(scaleX, scaleY);
        ctx.translate(200, 25);

        ctx.beginPath();
        ctx.moveTo(-w / 2, -h / 2 + ry);
        // upper arc top
        ctx.ellipse(0, -h / 2 + ry, rx, ry, Math.PI, 0, Math.PI, 0);
        ctx.moveTo(-w / 2, -h / 2 + ry);
        // upper arc bottom
        ctx.ellipse(0, -h / 2 + ry, rx, ry, Math.PI, 0, Math.PI, 1);
        ctx.moveTo(-w / 2, -h / 2 + ry);
        // left line
        ctx.lineTo(-w / 2, + h / 2 - ry);
        // lower arc
        ctx.ellipse(0, h / 2 - ry, rx, ry, Math.PI, 0, Math.PI, 1);
        // right line
        ctx.lineTo(w / 2, -h / 2 + ry);
        ctx.moveTo(-w / 2, -h / 2 + ry);
        ctx.closePath();

        // Remove scale before stroking because the SVG conversion is not correctly
        // scaling the stroke as well. Without this the pixel differences are too
        // high.
        ctx.resetTransform();
        ctx.stroke();
    }

    function fillStyle(ctx) {
        for (var i = 0; i < 6; i++) {
            for (var j = 0; j < 6; j++) {
                ctx.fillStyle = 'rgb(' + Math.floor(255 - 42.5 * i) + ',' +
                    Math.floor(255 - 42.5 * j) + ',0)';
                ctx.fillRect(j * 25, i * 25, 25, 25);
            }
        }
    }

    function globalAlpha(ctx) {
        ctx.fillStyle = '#FD0';
        ctx.fillRect(0,0,75,75);
        ctx.fillStyle = '#6C0';
        ctx.fillRect(75,0,75,75);
        ctx.fillStyle = '#09F';
        ctx.fillRect(0,75,75,75);
        ctx.fillStyle = '#F30';
        ctx.fillRect(75,75,75,75);
        ctx.fillStyle = '#FFF';

        // set transparency value
        ctx.globalAlpha = 0.2;

        // Draw semi transparent circles
        for (let i=0;i<7;i++){
            ctx.beginPath();
            ctx.arc(75,75,10+10*i,0,Math.PI*2,true);
            ctx.fill();
        }

        ctx.globalAlpha = 1.0;
    }

    function gradient(ctx) {
        ctx.save();
        ctx.strokeStyle='rgba(0,0,0,0)';
        ctx.lineCap='butt';
        ctx.lineJoin='miter';
        ctx.miterLimit=10.0;
        ctx.font='10px sans-serif';
        ctx.save();
        var radialGradient_1389130830351 = ctx.createRadialGradient(6E1,6E1,0.0,6E1,6E1,5E1);
        radialGradient_1389130830351.addColorStop(0E0,'red');
        radialGradient_1389130830351.addColorStop(1E0,'blue');
        ctx.fillStyle=radialGradient_1389130830351;
        ctx.font='10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(2.5E1,1E1);
        ctx.lineTo(9.5E1,1E1);
        ctx.quadraticCurveTo(1.1E2,1E1,1.1E2,2.5E1);
        ctx.lineTo(1.1E2,9.5E1);
        ctx.quadraticCurveTo(1.1E2,1.1E2,9.5E1,1.1E2);
        ctx.lineTo(2.5E1,1.1E2);
        ctx.quadraticCurveTo(1E1,1.1E2,1E1,9.5E1);
        ctx.lineTo(1E1,2.5E1);
        ctx.quadraticCurveTo(1E1,1E1,2.5E1,1E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.save();
        var radialGradient_1389130830351 = ctx.createRadialGradient(3.5E1,1.45E2,0.0,3.5E1,1.45E2,2.5E1);
        radialGradient_1389130830351.addColorStop(0E0,'red');
        radialGradient_1389130830351.addColorStop(1E0,'blue');
        ctx.fillStyle=radialGradient_1389130830351;
        ctx.font='10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(2.5E1,1.2E2);
        ctx.lineTo(9.5E1,1.2E2);
        ctx.quadraticCurveTo(1.1E2,1.2E2,1.1E2,1.35E2);
        ctx.lineTo(1.1E2,2.05E2);
        ctx.quadraticCurveTo(1.1E2,2.2E2,9.5E1,2.2E2);
        ctx.lineTo(2.5E1,2.2E2);
        ctx.quadraticCurveTo(1E1,2.2E2,1E1,2.05E2);
        ctx.lineTo(1E1,1.35E2);
        ctx.quadraticCurveTo(1E1,1.2E2,2.5E1,1.2E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
    }

    function linecap(ctx) {
        var lineCap = ['butt','round','square'];

        // Draw guides
        ctx.strokeStyle = '#09f';
        ctx.beginPath();
        ctx.moveTo(10,10);
        ctx.lineTo(140,10);
        ctx.moveTo(10,140);
        ctx.lineTo(140,140);
        ctx.stroke();

        // Draw lines
        ctx.strokeStyle = 'black';
        for (let i=0;i<lineCap.length;i++){
            ctx.lineWidth = 15;
            ctx.lineCap = lineCap[i];
            ctx.beginPath();
            ctx.moveTo(25+i*50,10);
            ctx.lineTo(25+i*50,140);
            ctx.stroke();
        }
    }

    function linewidth(ctx) {
        for (var i = 0; i < 10; i++){
            ctx.lineWidth = 1+i;
            ctx.beginPath();
            ctx.moveTo(5+i*14,5);
            ctx.lineTo(5+i*14,140);
            ctx.stroke();
        }
    }

    function scaledLine(ctx) {
      ctx.scale(1.5, 1.5);
      for (var i = 0; i < 10; i++){
          ctx.lineWidth = 1+i;
          ctx.beginPath();
          ctx.moveTo(5+i*14,5);
          ctx.lineTo(5+i*14,140);
          ctx.stroke();
      }
    }

    function rgba(ctx) {
        // Draw background
        ctx.fillStyle = 'rgb(255,221,0)';
        ctx.fillRect(0,0,150,37.5);
        ctx.fillStyle = 'rgb(102,204,0)';
        ctx.fillRect(0,37.5,150,37.5);
        ctx.fillStyle = 'rgb(0,153,255)';
        ctx.fillRect(0,75,150,37.5);
        ctx.fillStyle = 'rgb(255,51,0)';
        ctx.fillRect(0,112.5,150,37.5);

        // Draw semi transparent rectangles
        for (var i=0;i<10;i++){
            ctx.fillStyle = 'rgba(255,255,255,'+(i+1)/10+')';
            for (var j=0;j<4;j++){
                ctx.fillRect(5+i*14,5+j*37.5,14,27.5);
            }
        }
    }

    // Example from https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/rotate
    function rotate(ctx) {
        ctx.fillStyle = 'gray';
        ctx.fillRect(80, 60, 140, 30);

        // Matrix transformation
        ctx.translate(150, 75);
        ctx.rotate(Math.PI / 2);
        ctx.translate(-150, -75);

        // Rotated rectangle
        ctx.fillStyle = 'red';
        ctx.fillRect(80, 60, 140, 30);

        ctx.resetTransform();
    }

    function saveAndRestore(ctx) {
        ctx.fillRect(0, 0, 150, 150);   // Draw a rectangle with default settings
        ctx.save();                  // Save the default state

        ctx.fillStyle = '#09F';      // Make changes to the settings
        ctx.fillRect(15, 15, 120, 120); // Draw a rectangle with new settings

        ctx.save();                  // Save the current state
        ctx.fillStyle = '#FFF';      // Make changes to the settings
        ctx.globalAlpha = 0.5;
        ctx.fillRect(30, 30, 90, 90);   // Draw a rectangle with new settings

        ctx.restore();               // Restore previous state
        ctx.fillRect(45, 45, 60, 60);   // Draw a rectangle with restored settings

        ctx.restore();               // Restore original state
        ctx.fillRect(60, 60, 30, 30);   // Draw a rectangle with restored settings
    }

    function setLineDash(ctx) {
        ctx.save();
        ctx.lineWidth = 4;
        for (var i = 0; i < 10; i++){
            ctx.setLineDash([(i+1)*5,10]);
            ctx.beginPath();
            ctx.moveTo(5+i*14,5);
            ctx.lineTo(5+i*14,140);
            ctx.stroke();
        }
        ctx.restore();
    }

    function text(ctx) {
        ctx.font = "normal 120px Arial";
        ctx.fillStyle = "#000000";
        ctx.fillText("Hello", 0, 200);
    }

    function tiger(ctx) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0,0,0,0)';
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';
        ctx.miterLimit = 10.0;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.font = '10px sans-serif';
        ctx.translate(2E2, 2E2);
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.72E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.72E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.22304E2), 8.4285E1);
        ctx.bezierCurveTo((-1.22304E2), 8.4285E1, (-1.22203E2), 8.6179E1, (-1.23027E2), 8.616E1);
        ctx.bezierCurveTo((-1.23851E2), 8.6141E1, (-1.40305E2), 3.8066E1, (-1.60833E2), 4.0309E1);
        ctx.bezierCurveTo((-1.60833E2), 4.0309E1, (-1.4305E2), 3.2956E1, (-1.22304E2), 8.4285E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.72E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.72E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.18774E2), 8.1262E1);
        ctx.bezierCurveTo((-1.18774E2), 8.1262E1, (-1.19323E2), 8.3078E1, (-1.20092E2), 8.2779E1);
        ctx.bezierCurveTo((-1.2086E2), 8.2481E1, (-1.19977E2), 3.1675E1, (-1.40043E2), 2.6801E1);
        ctx.bezierCurveTo((-1.40043E2), 2.6801E1, (-1.2082E2), 2.5937E1, (-1.18774E2), 8.1262E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.72E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.72E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-9.1284E1), 1.2359E2);
        ctx.bezierCurveTo((-9.1284E1), 1.2359E2, (-8.9648E1), 1.2455E2, (-9.0118E1), 1.25227E2);
        ctx.bezierCurveTo((-9.0589E1), 1.25904E2, (-1.39763E2), 1.13102E2, (-1.49218E2), 1.31459E2);
        ctx.bezierCurveTo((-1.49218E2), 1.31459E2, (-1.45539E2), 1.12572E2, (-9.1284E1), 1.2359E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.72E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.72E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-9.4093E1), 1.33801E2);
        ctx.bezierCurveTo((-9.4093E1), 1.33801E2, (-9.2237E1), 1.34197E2, (-9.2471E1), 1.34988E2);
        ctx.bezierCurveTo((-9.2704E1), 1.35779E2, (-1.43407E2), 1.39121E2, (-1.46597E2), 1.59522E2);
        ctx.bezierCurveTo((-1.46597E2), 1.59522E2, (-1.49055E2), 1.40437E2, (-9.4093E1), 1.33801E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.72E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.72E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-9.8304E1), 1.28276E2);
        ctx.bezierCurveTo((-9.8304E1), 1.28276E2, (-9.6526E1), 1.28939E2, (-9.6872E1), 1.29687E2);
        ctx.bezierCurveTo((-9.7218E1), 1.30435E2, (-1.47866E2), 1.26346E2, (-1.53998E2), 1.46064E2);
        ctx.bezierCurveTo((-1.53998E2), 1.46064E2, (-1.53646E2), 1.26825E2, (-9.8304E1), 1.28276E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.72E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.72E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.09009E2), 1.10072E2);
        ctx.bezierCurveTo((-1.09009E2), 1.10072E2, (-1.07701E2), 1.11446E2, (-1.0834E2), 1.11967E2);
        ctx.bezierCurveTo((-1.08979E2), 1.12488E2, (-1.52722E2), 8.6634E1, (-1.66869E2), 1.01676E2);
        ctx.bezierCurveTo((-1.66869E2), 1.01676E2, (-1.58128E2), 8.4533E1, (-1.09009E2), 1.10072E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.72E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.72E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.16554E2), 1.14263E2);
        ctx.bezierCurveTo((-1.16554E2), 1.14263E2, (-1.15098E2), 1.1548E2, (-1.15674E2), 1.16071E2);
        ctx.bezierCurveTo((-1.1625E2), 1.16661E2, (-1.62638E2), 9.5922E1, (-1.74992E2), 1.12469E2);
        ctx.bezierCurveTo((-1.74992E2), 1.12469E2, (-1.68247E2), 9.4447E1, (-1.16554E2), 1.14263E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.72E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.72E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.19154E2), 1.18335E2);
        ctx.bezierCurveTo((-1.19154E2), 1.18335E2, (-1.17546E2), 1.19343E2, (-1.18036E2), 1.20006E2);
        ctx.bezierCurveTo((-1.18526E2), 1.20669E2, (-1.67308E2), 1.06446E2, (-1.77291E2), 1.24522E2);
        ctx.bezierCurveTo((-1.77291E2), 1.24522E2, (-1.73066E2), 1.05749E2, (-1.19154E2), 1.18335E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.72E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.72E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.0842E2), 1.18949E2);
        ctx.bezierCurveTo((-1.0842E2), 1.18949E2, (-1.07298E2), 1.2048E2, (-1.07999E2), 1.20915E2);
        ctx.bezierCurveTo((-1.087E2), 1.2135E2, (-1.48769E2), 9.0102E1, (-1.64727E2), 1.03207E2);
        ctx.bezierCurveTo((-1.64727E2), 1.03207E2, (-1.53862E2), 8.7326E1, (-1.0842E2), 1.18949E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.72E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.72E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.282E2), 9E1);
        ctx.bezierCurveTo((-1.282E2), 9E1, (-1.276E2), 9.18E1, (-1.284E2), 9.2E1);
        ctx.bezierCurveTo((-1.292E2), 9.22E1, (-1.578E2), 5.02E1, (-1.77001E2), 5.78E1);
        ctx.bezierCurveTo((-1.77001E2), 5.78E1, (-1.618E2), 4.6E1, (-1.282E2), 9E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.72E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.72E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.27505E2), 9.6979E1);
        ctx.bezierCurveTo((-1.27505E2), 9.6979E1, (-1.2653E2), 9.8608E1, (-1.27269E2), 9.8975E1);
        ctx.bezierCurveTo((-1.28007E2), 9.9343E1, (-1.64992E2), 6.4499E1, (-1.82101E2), 7.6061E1);
        ctx.bezierCurveTo((-1.82101E2), 7.6061E1, (-1.69804E2), 6.1261E1, (-1.27505E2), 9.6979E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.72E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.72E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.2762E2), 1.01349E2);
        ctx.bezierCurveTo((-1.2762E2), 1.01349E2, (-1.26498E2), 1.0288E2, (-1.27199E2), 1.03315E2);
        ctx.bezierCurveTo((-1.279E2), 1.03749E2, (-1.67969E2), 7.2502E1, (-1.83927E2), 8.5607E1);
        ctx.bezierCurveTo((-1.83927E2), 8.5607E1, (-1.73062E2), 6.9726E1, (-1.2762E2), 1.01349E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.2983E2), 1.03065E2);
        ctx.bezierCurveTo((-1.29327E2), 1.09113E2, (-1.28339E2), 1.15682E2, (-1.266E2), 1.18801E2);
        ctx.bezierCurveTo((-1.266E2), 1.18801E2, (-1.302E2), 1.31201E2, (-1.214E2), 1.44401E2);
        ctx.bezierCurveTo((-1.214E2), 1.44401E2, (-1.218E2), 1.51601E2, (-1.202E2), 1.54801E2);
        ctx.bezierCurveTo((-1.202E2), 1.54801E2, (-1.162E2), 1.63201E2, (-1.114E2), 1.64001E2);
        ctx.bezierCurveTo((-1.07516E2), 1.64648E2, (-9.8793E1), 1.67717E2, (-8.8932E1), 1.69121E2);
        ctx.bezierCurveTo((-8.8932E1), 1.69121E2, (-7.18E1), 1.83201E2, (-7.5E1), 1.96001E2);
        ctx.bezierCurveTo((-7.5E1), 1.96001E2, (-7.54E1), 2.12401E2, (-7.9E1), 2.14001E2);
        ctx.bezierCurveTo((-7.9E1), 2.14001E2, (-6.74E1), 2.02801E2, (-7.7E1), 2.19601E2);
        ctx.lineTo((-8.14E1), 2.38401E2);
        ctx.bezierCurveTo((-8.14E1), 2.38401E2, (-5.58E1), 2.16801E2, (-7.14E1), 2.35201E2);
        ctx.lineTo((-8.14E1), 2.61201E2);
        ctx.bezierCurveTo((-8.14E1), 2.61201E2, (-6.18E1), 2.42801E2, (-6.9E1), 2.51201E2);
        ctx.lineTo((-7.22E1), 2.60001E2);
        ctx.bezierCurveTo((-7.22E1), 2.60001E2, (-2.9E1), 2.32801E2, (-5.98E1), 2.62401E2);
        ctx.bezierCurveTo((-5.98E1), 2.62401E2, (-5.18E1), 2.58801E2, (-4.74E1), 2.61601E2);
        ctx.bezierCurveTo((-4.74E1), 2.61601E2, (-4.06E1), 2.60401E2, (-4.14E1), 2.62001E2);
        ctx.bezierCurveTo((-4.14E1), 2.62001E2, (-6.22E1), 2.72401E2, (-6.58E1), 2.90801E2);
        ctx.bezierCurveTo((-6.58E1), 2.90801E2, (-5.74E1), 2.80801E2, (-6.06E1), 2.91601E2);
        ctx.lineTo((-6.02E1), 3.03201E2);
        ctx.bezierCurveTo((-6.02E1), 3.03201E2, (-5.62E1), 2.81601E2, (-5.66E1), 3.19201E2);
        ctx.bezierCurveTo((-5.66E1), 3.19201E2, (-3.74E1), 3.01201E2, (-4.9E1), 3.22001E2);
        ctx.lineTo((-4.9E1), 3.38801E2);
        ctx.bezierCurveTo((-4.9E1), 3.38801E2, (-3.38E1), 3.22401E2, (-4.02E1), 3.35201E2);
        ctx.bezierCurveTo((-4.02E1), 3.35201E2, (-3.02E1), 3.26401E2, (-3.42E1), 3.41601E2);
        ctx.bezierCurveTo((-3.42E1), 3.41601E2, (-3.5E1), 3.52001E2, (-3.06E1), 3.40801E2);
        ctx.bezierCurveTo((-3.06E1), 3.40801E2, (-1.46E1), 3.10201E2, (-2.06E1), 3.36401E2);
        ctx.bezierCurveTo((-2.06E1), 3.36401E2, (-2.14E1), 3.55601E2, (-1.66E1), 3.40801E2);
        ctx.bezierCurveTo((-1.66E1), 3.40801E2, (-1.62E1), 3.51201E2, (-7E0), 3.58401E2);
        ctx.bezierCurveTo((-7E0), 3.58401E2, (-8.2E0), 3.07601E2, 4.6E0, 3.43601E2);
        ctx.lineTo(8.6E0, 3.60001E2);
        ctx.bezierCurveTo(8.6E0, 3.60001E2, 1.14E1, 3.50801E2, 1.1E1, 3.45601E2);
        ctx.bezierCurveTo(1.1E1, 3.45601E2, 2.58E1, 3.29201E2, 1.9E1, 3.53601E2);
        ctx.bezierCurveTo(1.9E1, 3.53601E2, 3.42E1, 3.30801E2, 3.1E1, 3.44001E2);
        ctx.bezierCurveTo(3.1E1, 3.44001E2, 2.34E1, 3.60001E2, 2.5E1, 3.64801E2);
        ctx.bezierCurveTo(2.5E1, 3.64801E2, 4.18E1, 3.30001E2, 4.3E1, 3.28401E2);
        ctx.bezierCurveTo(4.3E1, 3.28401E2, 4.1E1, 3.70802E2, 5.18E1, 3.34801E2);
        ctx.bezierCurveTo(5.18E1, 3.34801E2, 5.74E1, 3.46801E2, 5.46E1, 3.51201E2);
        ctx.bezierCurveTo(5.46E1, 3.51201E2, 6.26E1, 3.43201E2, 6.18E1, 3.40001E2);
        ctx.bezierCurveTo(6.18E1, 3.40001E2, 6.64E1, 3.31801E2, 6.92E1, 3.45401E2);
        ctx.bezierCurveTo(6.92E1, 3.45401E2, 7.1E1, 3.54801E2, 7.26E1, 3.51601E2);
        ctx.bezierCurveTo(7.26E1, 3.51601E2, 7.66E1, 3.75602E2, 7.78E1, 3.52801E2);
        ctx.bezierCurveTo(7.78E1, 3.52801E2, 7.94E1, 3.39201E2, 7.22E1, 3.27601E2);
        ctx.bezierCurveTo(7.22E1, 3.27601E2, 7.3E1, 3.24401E2, 7.02E1, 3.20401E2);
        ctx.bezierCurveTo(7.02E1, 3.20401E2, 8.38E1, 3.42001E2, 7.66E1, 3.13201E2);
        ctx.bezierCurveTo(7.66E1, 3.13201E2, 8.7801E1, 3.21201E2, 8.9001E1, 3.21201E2);
        ctx.bezierCurveTo(8.9001E1, 3.21201E2, 7.54E1, 2.98001E2, 8.42E1, 3.02801E2);
        ctx.bezierCurveTo(8.42E1, 3.02801E2, 7.9E1, 2.92401E2, 9.7001E1, 3.04401E2);
        ctx.bezierCurveTo(9.7001E1, 3.04401E2, 8.1E1, 2.88401E2, 9.8601E1, 2.98001E2);
        ctx.bezierCurveTo(9.8601E1, 2.98001E2, 1.06601E2, 3.04401E2, 9.9001E1, 2.94401E2);
        ctx.bezierCurveTo(9.9001E1, 2.94401E2, 8.46E1, 2.78401E2, 1.06601E2, 2.96401E2);
        ctx.bezierCurveTo(1.06601E2, 2.96401E2, 1.18201E2, 3.12801E2, 1.19001E2, 3.15601E2);
        ctx.bezierCurveTo(1.19001E2, 3.15601E2, 1.09001E2, 2.86401E2, 1.04601E2, 2.83601E2);
        ctx.bezierCurveTo(1.04601E2, 2.83601E2, 1.13001E2, 2.47201E2, 1.54201E2, 2.62801E2);
        ctx.bezierCurveTo(1.54201E2, 2.62801E2, 1.61001E2, 2.80001E2, 1.65401E2, 2.61601E2);
        ctx.bezierCurveTo(1.65401E2, 2.61601E2, 1.78201E2, 2.55201E2, 1.89401E2, 2.82801E2);
        ctx.bezierCurveTo(1.89401E2, 2.82801E2, 1.93401E2, 2.69201E2, 1.92601E2, 2.66401E2);
        ctx.bezierCurveTo(1.92601E2, 2.66401E2, 1.99401E2, 2.67601E2, 1.98601E2, 2.66401E2);
        ctx.bezierCurveTo(1.98601E2, 2.66401E2, 2.11801E2, 2.70801E2, 2.13001E2, 2.70001E2);
        ctx.bezierCurveTo(2.13001E2, 2.70001E2, 2.19801E2, 2.76801E2, 2.20201E2, 2.73201E2);
        ctx.bezierCurveTo(2.20201E2, 2.73201E2, 2.29401E2, 2.76001E2, 2.27401E2, 2.72401E2);
        ctx.bezierCurveTo(2.27401E2, 2.72401E2, 2.36201E2, 2.88001E2, 2.36601E2, 2.91601E2);
        ctx.lineTo(2.39001E2, 2.77601E2);
        ctx.lineTo(2.41001E2, 2.80401E2);
        ctx.bezierCurveTo(2.41001E2, 2.80401E2, 2.42601E2, 2.72801E2, 2.41801E2, 2.71601E2);
        ctx.bezierCurveTo(2.41001E2, 2.70401E2, 2.61801E2, 2.78401E2, 2.66601E2, 2.99201E2);
        ctx.lineTo(2.68601E2, 3.07601E2);
        ctx.bezierCurveTo(2.68601E2, 3.07601E2, 2.74601E2, 2.92801E2, 2.73001E2, 2.88801E2);
        ctx.bezierCurveTo(2.73001E2, 2.88801E2, 2.78201E2, 2.89601E2, 2.78601E2, 2.94001E2);
        ctx.bezierCurveTo(2.78601E2, 2.94001E2, 2.82601E2, 2.70801E2, 2.77801E2, 2.64801E2);
        ctx.bezierCurveTo(2.77801E2, 2.64801E2, 2.82201E2, 2.64001E2, 2.83401E2, 2.67601E2);
        ctx.lineTo(2.83401E2, 2.60401E2);
        ctx.bezierCurveTo(2.83401E2, 2.60401E2, 2.90601E2, 2.61201E2, 2.90601E2, 2.58801E2);
        ctx.bezierCurveTo(2.90601E2, 2.58801E2, 2.95001E2, 2.54801E2, 2.97001E2, 2.59601E2);
        ctx.bezierCurveTo(2.97001E2, 2.59601E2, 2.84601E2, 2.24401E2, 3.03001E2, 2.43601E2);
        ctx.bezierCurveTo(3.03001E2, 2.43601E2, 3.10201E2, 2.54401E2, 3.06601E2, 2.35601E2);
        ctx.bezierCurveTo(3.03001E2, 2.16801E2, 2.99001E2, 2.15201E2, 3.03801E2, 2.14801E2);
        ctx.bezierCurveTo(3.03801E2, 2.14801E2, 3.04601E2, 2.11201E2, 3.02601E2, 2.09601E2);
        ctx.bezierCurveTo(3.00601E2, 2.08001E2, 3.03801E2, 2.09601E2, 3.03801E2, 2.09601E2);
        ctx.bezierCurveTo(3.03801E2, 2.09601E2, 3.08601E2, 2.13601E2, 3.03401E2, 1.91601E2);
        ctx.bezierCurveTo(3.03401E2, 1.91601E2, 3.09801E2, 1.93201E2, 2.97801E2, 1.64001E2);
        ctx.bezierCurveTo(2.97801E2, 1.64001E2, 3.00601E2, 1.61601E2, 2.96601E2, 1.53201E2);
        ctx.bezierCurveTo(2.96601E2, 1.53201E2, 3.04601E2, 1.57601E2, 3.07401E2, 1.56001E2);
        ctx.bezierCurveTo(3.07401E2, 1.56001E2, 3.07001E2, 1.54401E2, 3.03801E2, 1.50401E2);
        ctx.bezierCurveTo(3.03801E2, 1.50401E2, 2.82201E2, 9.56E1, 3.02601E2, 1.17601E2);
        ctx.bezierCurveTo(3.02601E2, 1.17601E2, 3.14451E2, 1.31151E2, 3.08051E2, 1.08351E2);
        ctx.bezierCurveTo(3.08051E2, 1.08351E2, 2.9894E2, 8.4341E1, 2.99717E2, 8.0045E1);
        ctx.lineTo((-1.2983E2), 1.03065E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cc7226';
        ctx.fillStyle = 'rgba(204,114,38,1)';
        ctx.strokeStyle = '#000000';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cc7226';
        ctx.fillStyle = 'rgba(204,114,38,1)';
        ctx.strokeStyle = '#000000';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(2.99717E2, 8.0245E1);
        ctx.bezierCurveTo(3.00345E2, 8.0426E1, 3.02551E2, 8.155E1, 3.03801E2, 8.32E1);
        ctx.bezierCurveTo(3.03801E2, 8.32E1, 3.10601E2, 9.4E1, 3.05401E2, 7.56E1);
        ctx.bezierCurveTo(3.05401E2, 7.56E1, 2.96201E2, 4.68E1, 3.05001E2, 5.8E1);
        ctx.bezierCurveTo(3.05001E2, 5.8E1, 3.11001E2, 6.52E1, 3.07801E2, 5.16E1);
        ctx.bezierCurveTo(3.03936E2, 3.5173E1, 3.01401E2, 2.88E1, 3.01401E2, 2.88E1);
        ctx.bezierCurveTo(3.01401E2, 2.88E1, 3.13001E2, 3.36E1, 2.86201E2, (-6E0));
        ctx.lineTo(2.95001E2, (-2.4E0));
        ctx.bezierCurveTo(2.95001E2, (-2.4E0), 2.75401E2, (-4.2E1), 2.53801E2, (-4.72E1));
        ctx.lineTo(2.45801E2, (-5.32E1));
        ctx.bezierCurveTo(2.45801E2, (-5.32E1), 2.84201E2, (-9.12E1), 2.71401E2, (-1.28E2));
        ctx.bezierCurveTo(2.71401E2, (-1.28E2), 2.64601E2, (-1.332E2), 2.55001E2, (-1.24E2));
        ctx.bezierCurveTo(2.55001E2, (-1.24E2), 2.48601E2, (-1.192E2), 2.42601E2, (-1.208E2));
        ctx.bezierCurveTo(2.42601E2, (-1.208E2), 2.11801E2, (-1.196E2), 2.09801E2, (-1.196E2));
        ctx.bezierCurveTo(2.07801E2, (-1.196E2), 1.73001E2, (-1.568E2), 1.07401E2, (-1.392E2));
        ctx.bezierCurveTo(1.07401E2, (-1.392E2), 1.02201E2, (-1.372E2), 9.7801E1, (-1.384E2));
        ctx.bezierCurveTo(9.7801E1, (-1.384E2), 7.94E1, (-1.544E2), 3.06E1, (-1.316E2));
        ctx.bezierCurveTo(3.06E1, (-1.316E2), 2.06E1, (-1.296E2), 1.9E1, (-1.296E2));
        ctx.bezierCurveTo(1.74E1, (-1.296E2), 1.46E1, (-1.296E2), 6.6E0, (-1.232E2));
        ctx.bezierCurveTo((-1.4E0), (-1.168E2), (-1.8E0), (-1.16E2), (-3.8E0), (-1.144E2));
        ctx.bezierCurveTo((-3.8E0), (-1.144E2), (-2.02E1), (-1.032E2), (-2.5E1), (-1.024E2));
        ctx.bezierCurveTo((-2.5E1), (-1.024E2), (-3.66E1), (-9.6E1), (-4.1E1), (-8.6E1));
        ctx.lineTo((-4.46E1), (-8.48E1));
        ctx.bezierCurveTo((-4.46E1), (-8.48E1), (-4.62E1), (-7.76E1), (-4.66E1), (-7.64E1));
        ctx.bezierCurveTo((-4.66E1), (-7.64E1), (-5.14E1), (-7.28E1), (-5.22E1), (-6.72E1));
        ctx.bezierCurveTo((-5.22E1), (-6.72E1), (-6.1E1), (-6.12E1), (-6.06E1), (-5.68E1));
        ctx.bezierCurveTo((-6.06E1), (-5.68E1), (-6.22E1), (-5.16E1), (-6.3E1), (-4.68E1));
        ctx.bezierCurveTo((-6.3E1), (-4.68E1), (-7.02E1), (-4.2E1), (-6.94E1), (-3.92E1));
        ctx.bezierCurveTo((-6.94E1), (-3.92E1), (-7.7E1), (-2.52E1), (-7.58E1), (-1.84E1));
        ctx.bezierCurveTo((-7.58E1), (-1.84E1), (-8.22E1), (-1.88E1), (-8.5E1), (-1.64E1));
        ctx.bezierCurveTo((-8.5E1), (-1.64E1), (-8.58E1), (-1.16E1), (-8.74E1), (-1.12E1));
        ctx.bezierCurveTo((-8.74E1), (-1.12E1), (-9.02E1), (-1E1), (-8.78E1), (-6E0));
        ctx.bezierCurveTo((-8.78E1), (-6E0), (-8.94E1), (-3.2E0), (-8.98E1), (-1.6E0));
        ctx.bezierCurveTo((-8.98E1), (-1.6E0), (-8.9E1), 1.2E0, (-9.34E1), 6.8E0);
        ctx.bezierCurveTo((-9.34E1), 6.8E0, (-9.98E1), 2.56E1, (-9.78E1), 3.08E1);
        ctx.bezierCurveTo((-9.78E1), 3.08E1, (-9.74E1), 3.56E1, (-1.002E2), 3.72E1);
        ctx.bezierCurveTo((-1.002E2), 3.72E1, (-1.038E2), 3.68E1, (-9.54E1), 4.88E1);
        ctx.bezierCurveTo((-9.54E1), 4.88E1, (-9.46E1), 5E1, (-9.78E1), 5.24E1);
        ctx.bezierCurveTo((-9.78E1), 5.24E1, (-1.15E2), 5.6E1, (-1.174E2), 7.24E1);
        ctx.bezierCurveTo((-1.174E2), 7.24E1, (-1.31E2), 8.72E1, (-1.31E2), 9.24E1);
        ctx.bezierCurveTo((-1.31E2), 9.4705E1, (-1.30729E2), 9.7852E1, (-1.3003E2), 1.02465E2);
        ctx.bezierCurveTo((-1.3003E2), 1.02465E2, (-1.306E2), 1.10801E2, (-1.03E2), 1.11601E2);
        ctx.bezierCurveTo((-7.54E1), 1.12401E2, 2.99717E2, 8.0245E1, 2.99717E2, 8.0245E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cc7226';
        ctx.fillStyle = 'rgba(204,114,38,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cc7226';
        ctx.fillStyle = 'rgba(204,114,38,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.156E2), 1.026E2);
        ctx.bezierCurveTo((-1.406E2), 6.32E1, (-1.262E2), 1.19601E2, (-1.262E2), 1.19601E2);
        ctx.bezierCurveTo((-1.174E2), 1.54001E2, 1.22E1, 1.16401E2, 1.22E1, 1.16401E2);
        ctx.bezierCurveTo(1.22E1, 1.16401E2, 1.81001E2, 8.6E1, 1.92201E2, 8.2E1);
        ctx.bezierCurveTo(2.03401E2, 7.8E1, 2.98601E2, 8.44E1, 2.98601E2, 8.44E1);
        ctx.lineTo(2.93001E2, 6.76E1);
        ctx.bezierCurveTo(2.28201E2, 2.12E1, 2.09001E2, 4.44E1, 1.95401E2, 4.04E1);
        ctx.bezierCurveTo(1.81801E2, 3.64E1, 1.84201E2, 4.6E1, 1.81001E2, 4.68E1);
        ctx.bezierCurveTo(1.77801E2, 4.76E1, 1.38601E2, 2.28E1, 1.32201E2, 2.36E1);
        ctx.bezierCurveTo(1.25801E2, 2.44E1, 1.00459E2, 6.49E-1, 1.15401E2, 3.24E1);
        ctx.bezierCurveTo(1.31401E2, 6.64E1, 5.7E1, 7.16E1, 4.02E1, 6.04E1);
        ctx.bezierCurveTo(2.34E1, 4.92E1, 4.74E1, 7.88E1, 4.74E1, 7.88E1);
        ctx.bezierCurveTo(6.58E1, 9.88E1, 3.14E1, 8.2E1, 3.14E1, 8.2E1);
        ctx.bezierCurveTo((-3E0), 6.92E1, (-2.7E1), 9.48E1, (-3.02E1), 9.56E1);
        ctx.bezierCurveTo((-3.34E1), 9.64E1, (-3.82E1), 9.96E1, (-3.9E1), 9.32E1);
        ctx.bezierCurveTo((-3.98E1), 8.68E1, (-4.731E1), 7.0099E1, (-7.9E1), 9.64E1);
        ctx.bezierCurveTo((-9.9E1), 1.13001E2, (-1.128E2), 9.1E1, (-1.128E2), 9.1E1);
        ctx.lineTo((-1.156E2), 1.026E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#e87f3a';
        ctx.fillStyle = 'rgba(232,127,58,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#e87f3a';
        ctx.fillStyle = 'rgba(232,127,58,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(1.3351E2, 2.5346E1);
        ctx.bezierCurveTo(1.2711E2, 2.6146E1, 1.01743E2, 2.407E0, 1.1671E2, 3.4146E1);
        ctx.bezierCurveTo(1.3331E2, 6.9346E1, 5.831E1, 7.3346E1, 4.151E1, 6.2146E1);
        ctx.bezierCurveTo(2.4709E1, 5.0946E1, 4.871E1, 8.0546E1, 4.871E1, 8.0546E1);
        ctx.bezierCurveTo(6.711E1, 1.00546E2, 3.2709E1, 8.3746E1, 3.2709E1, 8.3746E1);
        ctx.bezierCurveTo((-1.691E0), 7.0946E1, (-2.5691E1), 9.6546E1, (-2.8891E1), 9.7346E1);
        ctx.bezierCurveTo((-3.2091E1), 9.8146E1, (-3.6891E1), 1.01346E2, (-3.7691E1), 9.4946E1);
        ctx.bezierCurveTo((-3.8491E1), 8.8546E1, (-4.587E1), 7.2012E1, (-7.7691E1), 9.8146E1);
        ctx.bezierCurveTo((-9.8927E1), 1.15492E2, (-1.12418E2), 9.4037E1, (-1.12418E2), 9.4037E1);
        ctx.lineTo((-1.15618E2), 1.04146E2);
        ctx.bezierCurveTo((-1.40618E2), 6.4346E1, (-1.25546E2), 1.22655E2, (-1.25546E2), 1.22655E2);
        ctx.bezierCurveTo((-1.16745E2), 1.57056E2, 1.3509E1, 1.18146E2, 1.3509E1, 1.18146E2);
        ctx.bezierCurveTo(1.3509E1, 1.18146E2, 1.8231E2, 8.7746E1, 1.9351E2, 8.3746E1);
        ctx.bezierCurveTo(2.0471E2, 7.9746E1, 2.99038E2, 8.6073E1, 2.99038E2, 8.6073E1);
        ctx.lineTo(2.9351E2, 6.8764E1);
        ctx.bezierCurveTo(2.2871E2, 2.2364E1, 2.1031E2, 4.6146E1, 1.9671E2, 4.2146E1);
        ctx.bezierCurveTo(1.8311E2, 3.8146E1, 1.8551E2, 4.7746E1, 1.8231E2, 4.8546E1);
        ctx.bezierCurveTo(1.7911E2, 4.9346E1, 1.3991E2, 2.4546E1, 1.3351E2, 2.5346E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ea8c4d';
        ctx.fillStyle = 'rgba(234,140,77,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ea8c4d';
        ctx.fillStyle = 'rgba(234,140,77,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(1.34819E2, 2.7091E1);
        ctx.bezierCurveTo(1.28419E2, 2.7891E1, 1.03685E2, 3.862E0, 1.18019E2, 3.5891E1);
        ctx.bezierCurveTo(1.34219E2, 7.2092E1, 5.9619E1, 7.5092E1, 4.2819E1, 6.3892E1);
        ctx.bezierCurveTo(2.6019E1, 5.2692E1, 5.0019E1, 8.2292E1, 5.0019E1, 8.2292E1);
        ctx.bezierCurveTo(6.8419E1, 1.02292E2, 3.4019E1, 8.5492E1, 3.4019E1, 8.5492E1);
        ctx.bezierCurveTo((-3.81E-1), 7.2692E1, (-2.4382E1), 9.8292E1, (-2.7582E1), 9.9092E1);
        ctx.bezierCurveTo((-3.0782E1), 9.9892E1, (-3.5582E1), 1.03092E2, (-3.6382E1), 9.6692E1);
        ctx.bezierCurveTo((-3.7182E1), 9.0292E1, (-4.443E1), 7.3925E1, (-7.6382E1), 9.9892E1);
        ctx.bezierCurveTo((-9.8855E1), 1.17983E2, (-1.12036E2), 9.7074E1, (-1.12036E2), 9.7074E1);
        ctx.lineTo((-1.15636E2), 1.05692E2);
        ctx.bezierCurveTo((-1.39436E2), 6.6692E1, (-1.24891E2), 1.2571E2, (-1.24891E2), 1.2571E2);
        ctx.bezierCurveTo((-1.16091E2), 1.6011E2, 1.4819E1, 1.19892E2, 1.4819E1, 1.19892E2);
        ctx.bezierCurveTo(1.4819E1, 1.19892E2, 1.83619E2, 8.9492E1, 1.94819E2, 8.5492E1);
        ctx.bezierCurveTo(2.06019E2, 8.1492E1, 2.99474E2, 8.7746E1, 2.99474E2, 8.7746E1);
        ctx.lineTo(2.9402E2, 6.9928E1);
        ctx.bezierCurveTo(2.29219E2, 2.3528E1, 2.11619E2, 4.7891E1, 1.98019E2, 4.3891E1);
        ctx.bezierCurveTo(1.84419E2, 3.9891E1, 1.86819E2, 4.9491E1, 1.83619E2, 5.0292E1);
        ctx.bezierCurveTo(1.80419E2, 5.1092E1, 1.41219E2, 2.6291E1, 1.34819E2, 2.7091E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ec9961';
        ctx.fillStyle = 'rgba(236,153,97,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ec9961';
        ctx.fillStyle = 'rgba(236,153,97,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(1.36128E2, 2.8837E1);
        ctx.bezierCurveTo(1.29728E2, 2.9637E1, 1.04999E2, 5.605E0, 1.19328E2, 3.7637E1);
        ctx.bezierCurveTo(1.36128E2, 7.5193E1, 6.0394E1, 7.6482E1, 4.4128E1, 6.5637E1);
        ctx.bezierCurveTo(2.7328E1, 5.4437E1, 5.1328E1, 8.4037E1, 5.1328E1, 8.4037E1);
        ctx.bezierCurveTo(6.9728E1, 1.04037E2, 3.5328E1, 8.7237E1, 3.5328E1, 8.7237E1);
        ctx.bezierCurveTo(9.28E-1, 7.4437E1, (-2.3072E1), 1.00037E2, (-2.6272E1), 1.00837E2);
        ctx.bezierCurveTo((-2.9472E1), 1.01637E2, (-3.4272E1), 1.04837E2, (-3.5072E1), 9.8437E1);
        ctx.bezierCurveTo((-3.5872E1), 9.2037E1, (-4.2989E1), 7.5839E1, (-7.5073E1), 1.01637E2);
        ctx.bezierCurveTo((-9.8782E1), 1.20474E2, (-1.11655E2), 1.0011E2, (-1.11655E2), 1.0011E2);
        ctx.lineTo((-1.15655E2), 1.07237E2);
        ctx.bezierCurveTo((-1.37455E2), 7.0437E1, (-1.24236E2), 1.28765E2, (-1.24236E2), 1.28765E2);
        ctx.bezierCurveTo((-1.15436E2), 1.63165E2, 1.6128E1, 1.21637E2, 1.6128E1, 1.21637E2);
        ctx.bezierCurveTo(1.6128E1, 1.21637E2, 1.84928E2, 9.1237E1, 1.96129E2, 8.7237E1);
        ctx.bezierCurveTo(2.07329E2, 8.3237E1, 2.99911E2, 8.9419E1, 2.99911E2, 8.9419E1);
        ctx.lineTo(2.94529E2, 7.1092E1);
        ctx.bezierCurveTo(2.29729E2, 2.4691E1, 2.12929E2, 4.9637E1, 1.99329E2, 4.5637E1);
        ctx.bezierCurveTo(1.85728E2, 4.1637E1, 1.88128E2, 5.1237E1, 1.84928E2, 5.2037E1);
        ctx.bezierCurveTo(1.81728E2, 5.2837E1, 1.42528E2, 2.8037E1, 1.36128E2, 2.8837E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#eea575';
        ctx.fillStyle = 'rgba(238,165,117,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#eea575';
        ctx.fillStyle = 'rgba(238,165,117,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(1.37438E2, 3.0583E1);
        ctx.bezierCurveTo(1.31037E2, 3.1383E1, 1.06814E2, 7.129E0, 1.20637E2, 3.9383E1);
        ctx.bezierCurveTo(1.37438E2, 7.8583E1, 6.2237E1, 7.8583E1, 4.5437E1, 6.7383E1);
        ctx.bezierCurveTo(2.8637E1, 5.6183E1, 5.2637E1, 8.5783E1, 5.2637E1, 8.5783E1);
        ctx.bezierCurveTo(7.1037E1, 1.05783E2, 3.6637E1, 8.8983E1, 3.6637E1, 8.8983E1);
        ctx.bezierCurveTo(2.237E0, 7.6183E1, (-2.1763E1), 1.01783E2, (-2.4963E1), 1.02583E2);
        ctx.bezierCurveTo((-2.8163E1), 1.03383E2, (-3.2963E1), 1.06583E2, (-3.3763E1), 1.00183E2);
        ctx.bezierCurveTo((-3.4563E1), 9.3783E1, (-4.1548E1), 7.7752E1, (-7.3763E1), 1.03383E2);
        ctx.bezierCurveTo((-9.8709E1), 1.22965E2, (-1.11273E2), 1.03146E2, (-1.11273E2), 1.03146E2);
        ctx.lineTo((-1.15673E2), 1.08783E2);
        ctx.bezierCurveTo((-1.35473E2), 7.3982E1, (-1.23582E2), 1.31819E2, (-1.23582E2), 1.31819E2);
        ctx.bezierCurveTo((-1.14782E2), 1.6622E2, 1.7437E1, 1.23383E2, 1.7437E1, 1.23383E2);
        ctx.bezierCurveTo(1.7437E1, 1.23383E2, 1.86238E2, 9.2983E1, 1.97438E2, 8.8983E1);
        ctx.bezierCurveTo(2.08638E2, 8.4983E1, 3.00347E2, 9.1092E1, 3.00347E2, 9.1092E1);
        ctx.lineTo(2.95038E2, 7.2255E1);
        ctx.bezierCurveTo(2.30238E2, 2.5855E1, 2.14238E2, 5.1383E1, 2.00638E2, 4.7383E1);
        ctx.bezierCurveTo(1.87038E2, 4.3383E1, 1.89438E2, 5.2983E1, 1.86238E2, 5.3783E1);
        ctx.bezierCurveTo(1.83038E2, 5.4583E1, 1.43838E2, 2.9783E1, 1.37438E2, 3.0583E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#f1b288';
        ctx.fillStyle = 'rgba(241,178,136,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#f1b288';
        ctx.fillStyle = 'rgba(241,178,136,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(1.38747E2, 3.2328E1);
        ctx.bezierCurveTo(1.32347E2, 3.3128E1, 1.06383E2, 9.677E0, 1.21947E2, 4.1128E1);
        ctx.bezierCurveTo(1.41147E2, 7.9928E1, 6.3546E1, 8.0328E1, 4.6746E1, 6.9128E1);
        ctx.bezierCurveTo(2.9946E1, 5.7928E1, 5.3946E1, 8.7528E1, 5.3946E1, 8.7528E1);
        ctx.bezierCurveTo(7.2346E1, 1.07528E2, 3.7946E1, 9.0728E1, 3.7946E1, 9.0728E1);
        ctx.bezierCurveTo(3.546E0, 7.7928E1, (-2.0454E1), 1.03528E2, (-2.3654E1), 1.04328E2);
        ctx.bezierCurveTo((-2.6854E1), 1.05128E2, (-3.1654E1), 1.08328E2, (-3.2454E1), 1.01928E2);
        ctx.bezierCurveTo((-3.3254E1), 9.5528E1, (-4.0108E1), 7.9665E1, (-7.2454E1), 1.05128E2);
        ctx.bezierCurveTo((-9.8636E1), 1.25456E2, (-1.10891E2), 1.06183E2, (-1.10891E2), 1.06183E2);
        ctx.lineTo((-1.15691E2), 1.10328E2);
        ctx.bezierCurveTo((-1.33691E2), 7.7128E1, (-1.22927E2), 1.34874E2, (-1.22927E2), 1.34874E2);
        ctx.bezierCurveTo((-1.14127E2), 1.69274E2, 1.8746E1, 1.25128E2, 1.8746E1, 1.25128E2);
        ctx.bezierCurveTo(1.8746E1, 1.25128E2, 1.87547E2, 9.4728E1, 1.98747E2, 9.0728E1);
        ctx.bezierCurveTo(2.09947E2, 8.6728E1, 3.00783E2, 9.2764E1, 3.00783E2, 9.2764E1);
        ctx.lineTo(2.95547E2, 7.3419E1);
        ctx.bezierCurveTo(2.30747E2, 2.7019E1, 2.15547E2, 5.3128E1, 2.01947E2, 4.9128E1);
        ctx.bezierCurveTo(1.88347E2, 4.5128E1, 1.90747E2, 5.4728E1, 1.87547E2, 5.5528E1);
        ctx.bezierCurveTo(1.84347E2, 5.6328E1, 1.45147E2, 3.1528E1, 1.38747E2, 3.2328E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#f3bf9c';
        ctx.fillStyle = 'rgba(243,191,156,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#f3bf9c';
        ctx.fillStyle = 'rgba(243,191,156,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(1.40056E2, 3.4073E1);
        ctx.bezierCurveTo(1.33655E2, 3.4873E1, 1.07313E2, 1.1613E1, 1.23255E2, 4.2873E1);
        ctx.bezierCurveTo(1.43656E2, 8.2874E1, 6.4855E1, 8.2074E1, 4.8055E1, 7.0874E1);
        ctx.bezierCurveTo(3.1255E1, 5.9674E1, 5.5255E1, 8.9274E1, 5.5255E1, 8.9274E1);
        ctx.bezierCurveTo(7.3655E1, 1.09274E2, 3.9255E1, 9.2474E1, 3.9255E1, 9.2474E1);
        ctx.bezierCurveTo(4.855E0, 7.9674E1, (-1.9145E1), 1.05274E2, (-2.2345E1), 1.06074E2);
        ctx.bezierCurveTo((-2.5545E1), 1.06874E2, (-3.0345E1), 1.10074E2, (-3.1145E1), 1.03674E2);
        ctx.bezierCurveTo((-3.1945E1), 9.7274E1, (-3.8668E1), 8.1578E1, (-7.1145E1), 1.06874E2);
        ctx.bezierCurveTo((-9.8564E1), 1.27947E2, (-1.10509E2), 1.09219E2, (-1.10509E2), 1.09219E2);
        ctx.lineTo((-1.15709E2), 1.11874E2);
        ctx.bezierCurveTo((-1.31709E2), 8.1674E1, (-1.22273E2), 1.37929E2, (-1.22273E2), 1.37929E2);
        ctx.bezierCurveTo((-1.13473E2), 1.72329E2, 2.0055E1, 1.26874E2, 2.0055E1, 1.26874E2);
        ctx.bezierCurveTo(2.0055E1, 1.26874E2, 1.88856E2, 9.6474E1, 2.00056E2, 9.2474E1);
        ctx.bezierCurveTo(2.11256E2, 8.8474E1, 3.0122E2, 9.4437E1, 3.0122E2, 9.4437E1);
        ctx.lineTo(2.96056E2, 7.4583E1);
        ctx.bezierCurveTo(2.31256E2, 2.8183E1, 2.16856E2, 5.4874E1, 2.03256E2, 5.0874E1);
        ctx.bezierCurveTo(1.89656E2, 4.6873E1, 1.92056E2, 5.6474E1, 1.88856E2, 5.7274E1);
        ctx.bezierCurveTo(1.85656E2, 5.8074E1, 1.46456E2, 3.3273E1, 1.40056E2, 3.4073E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#f5ccb0';
        ctx.fillStyle = 'rgba(245,204,176,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#f5ccb0';
        ctx.fillStyle = 'rgba(245,204,176,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(1.41365E2, 3.5819E1);
        ctx.bezierCurveTo(1.34965E2, 3.6619E1, 1.07523E2, 1.3944E1, 1.24565E2, 4.4619E1);
        ctx.bezierCurveTo(1.46565E2, 8.4219E1, 6.6164E1, 8.3819E1, 4.9364E1, 7.2619E1);
        ctx.bezierCurveTo(3.2564E1, 6.1419E1, 5.6564E1, 9.1019E1, 5.6564E1, 9.1019E1);
        ctx.bezierCurveTo(7.4964E1, 1.11019E2, 4.0564E1, 9.4219E1, 4.0564E1, 9.4219E1);
        ctx.bezierCurveTo(6.164E0, 8.1419E1, (-1.7836E1), 1.07019E2, (-2.1036E1), 1.07819E2);
        ctx.bezierCurveTo((-2.4236E1), 1.08619E2, (-2.9036E1), 1.11819E2, (-2.9836E1), 1.05419E2);
        ctx.bezierCurveTo((-3.0636E1), 9.9019E1, (-3.7227E1), 8.3492E1, (-6.9836E1), 1.08619E2);
        ctx.bezierCurveTo((-9.8491E1), 1.30438E2, (-1.10127E2), 1.12256E2, (-1.10127E2), 1.12256E2);
        ctx.lineTo((-1.15727E2), 1.13419E2);
        ctx.bezierCurveTo((-1.30128E2), 8.5019E1, (-1.21618E2), 1.40983E2, (-1.21618E2), 1.40983E2);
        ctx.bezierCurveTo((-1.12818E2), 1.75384E2, 2.1364E1, 1.28619E2, 2.1364E1, 1.28619E2);
        ctx.bezierCurveTo(2.1364E1, 1.28619E2, 1.90165E2, 9.8219E1, 2.01365E2, 9.4219E1);
        ctx.bezierCurveTo(2.12565E2, 9.0219E1, 3.01656E2, 9.611E1, 3.01656E2, 9.611E1);
        ctx.lineTo(2.96565E2, 7.5746E1);
        ctx.bezierCurveTo(2.31765E2, 2.9346E1, 2.18165E2, 5.6619E1, 2.04565E2, 5.2619E1);
        ctx.bezierCurveTo(1.90965E2, 4.8619E1, 1.93365E2, 5.8219E1, 1.90165E2, 5.9019E1);
        ctx.bezierCurveTo(1.86965E2, 5.9819E1, 1.47765E2, 3.5019E1, 1.41365E2, 3.5819E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#f8d8c4';
        ctx.fillStyle = 'rgba(248,216,196,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#f8d8c4';
        ctx.fillStyle = 'rgba(248,216,196,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(1.42674E2, 3.7565E1);
        ctx.bezierCurveTo(1.36274E2, 3.8365E1, 1.08832E2, 1.5689E1, 1.25874E2, 4.6365E1);
        ctx.bezierCurveTo(1.47874E2, 8.5965E1, 6.7474E1, 8.5565E1, 5.0674E1, 7.4365E1);
        ctx.bezierCurveTo(3.3874E1, 6.3165E1, 5.7874E1, 9.2765E1, 5.7874E1, 9.2765E1);
        ctx.bezierCurveTo(7.6274E1, 1.12765E2, 4.1874E1, 9.5965E1, 4.1874E1, 9.5965E1);
        ctx.bezierCurveTo(7.473E0, 8.3165E1, (-1.6527E1), 1.08765E2, (-1.9727E1), 1.09565E2);
        ctx.bezierCurveTo((-2.2927E1), 1.10365E2, (-2.7727E1), 1.13565E2, (-2.8527E1), 1.07165E2);
        ctx.bezierCurveTo((-2.9327E1), 1.00765E2, (-3.5786E1), 8.5405E1, (-6.8527E1), 1.10365E2);
        ctx.bezierCurveTo((-9.8418E1), 1.32929E2, (-1.09745E2), 1.15293E2, (-1.09745E2), 1.15293E2);
        ctx.lineTo((-1.15745E2), 1.14965E2);
        ctx.bezierCurveTo((-1.29346E2), 8.8564E1, (-1.20963E2), 1.44038E2, (-1.20963E2), 1.44038E2);
        ctx.bezierCurveTo((-1.12163E2), 1.78438E2, 2.2673E1, 1.30365E2, 2.2673E1, 1.30365E2);
        ctx.bezierCurveTo(2.2673E1, 1.30365E2, 1.91474E2, 9.9965E1, 2.02674E2, 9.5965E1);
        ctx.bezierCurveTo(2.13874E2, 9.1965E1, 3.02093E2, 9.7783E1, 3.02093E2, 9.7783E1);
        ctx.lineTo(2.97075E2, 7.691E1);
        ctx.bezierCurveTo(2.32274E2, 3.051E1, 2.19474E2, 5.8365E1, 2.05874E2, 5.4365E1);
        ctx.bezierCurveTo(1.92274E2, 5.0365E1, 1.94674E2, 5.9965E1, 1.91474E2, 6.0765E1);
        ctx.bezierCurveTo(1.88274E2, 6.1565E1, 1.49074E2, 3.6765E1, 1.42674E2, 3.7565E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#fae5d7';
        ctx.fillStyle = 'rgba(250,229,215,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#fae5d7';
        ctx.fillStyle = 'rgba(250,229,215,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(1.43983E2, 3.931E1);
        ctx.bezierCurveTo(1.37583E2, 4.011E1, 1.10529E2, 1.7223E1, 1.27183E2, 4.811E1);
        ctx.bezierCurveTo(1.49183E2, 8.891E1, 6.8783E1, 8.731E1, 5.1983E1, 7.611E1);
        ctx.bezierCurveTo(3.5183E1, 6.491E1, 5.9183E1, 9.451E1, 5.9183E1, 9.451E1);
        ctx.bezierCurveTo(7.7583E1, 1.1451E2, 4.3183E1, 9.771E1, 4.3183E1, 9.771E1);
        ctx.bezierCurveTo(8.783E0, 8.491E1, (-1.5217E1), 1.1051E2, (-1.8417E1), 1.1131E2);
        ctx.bezierCurveTo((-2.1618E1), 1.1211E2, (-2.6418E1), 1.1531E2, (-2.7218E1), 1.0891E2);
        ctx.bezierCurveTo((-2.8018E1), 1.0251E2, (-3.4346E1), 8.7318E1, (-6.7218E1), 1.1211E2);
        ctx.bezierCurveTo((-9.8345E1), 1.3542E2, (-1.09363E2), 1.18329E2, (-1.09363E2), 1.18329E2);
        ctx.lineTo((-1.15764E2), 1.1651E2);
        ctx.bezierCurveTo((-1.28764E2), 9.251E1, (-1.20309E2), 1.47093E2, (-1.20309E2), 1.47093E2);
        ctx.bezierCurveTo((-1.11509E2), 1.81493E2, 2.3983E1, 1.3211E2, 2.3983E1, 1.3211E2);
        ctx.bezierCurveTo(2.3983E1, 1.3211E2, 1.92783E2, 1.0171E2, 2.03983E2, 9.771E1);
        ctx.bezierCurveTo(2.15183E2, 9.371E1, 3.02529E2, 9.9456E1, 3.02529E2, 9.9456E1);
        ctx.lineTo(2.97583E2, 7.8074E1);
        ctx.bezierCurveTo(2.32783E2, 3.1673E1, 2.20783E2, 6.011E1, 2.07183E2, 5.611E1);
        ctx.bezierCurveTo(1.93583E2, 5.211E1, 1.95983E2, 6.171E1, 1.92783E2, 6.251E1);
        ctx.bezierCurveTo(1.89583E2, 6.331E1, 1.50383E2, 3.851E1, 1.43983E2, 3.931E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#fcf2eb';
        ctx.fillStyle = 'rgba(252,242,235,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#fcf2eb';
        ctx.fillStyle = 'rgba(252,242,235,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(1.45292E2, 4.1055E1);
        ctx.bezierCurveTo(1.38892E2, 4.1855E1, 1.12917E2, 1.8411E1, 1.28492E2, 4.9855E1);
        ctx.bezierCurveTo(1.49692E2, 9.2656E1, 7.0092E1, 8.9056E1, 5.3292E1, 7.7856E1);
        ctx.bezierCurveTo(3.6492E1, 6.6656E1, 6.0492E1, 9.6256E1, 6.0492E1, 9.6256E1);
        ctx.bezierCurveTo(7.8892E1, 1.16256E2, 4.4492E1, 9.9456E1, 4.4492E1, 9.9456E1);
        ctx.bezierCurveTo(1.0092E1, 8.6656E1, (-1.3908E1), 1.12256E2, (-1.7108E1), 1.13056E2);
        ctx.bezierCurveTo((-2.0308E1), 1.13856E2, (-2.5108E1), 1.17056E2, (-2.5908E1), 1.10656E2);
        ctx.bezierCurveTo((-2.6708E1), 1.04256E2, (-3.2905E1), 8.9232E1, (-6.5908E1), 1.13856E2);
        ctx.bezierCurveTo((-9.8273E1), 1.37911E2, (-1.08982E2), 1.21365E2, (-1.08982E2), 1.21365E2);
        ctx.lineTo((-1.15782E2), 1.18056E2);
        ctx.bezierCurveTo((-1.28582E2), 9.4856E1, (-1.19654E2), 1.50147E2, (-1.19654E2), 1.50147E2);
        ctx.bezierCurveTo((-1.10854E2), 1.84547E2, 2.5292E1, 1.33856E2, 2.5292E1, 1.33856E2);
        ctx.bezierCurveTo(2.5292E1, 1.33856E2, 1.94093E2, 1.03456E2, 2.05293E2, 9.9456E1);
        ctx.bezierCurveTo(2.16493E2, 9.5456E1, 3.02965E2, 1.01128E2, 3.02965E2, 1.01128E2);
        ctx.lineTo(2.98093E2, 7.9237E1);
        ctx.bezierCurveTo(2.33292E2, 3.2837E1, 2.22093E2, 6.1856E1, 2.08493E2, 5.7856E1);
        ctx.bezierCurveTo(1.94893E2, 5.3855E1, 1.97293E2, 6.3456E1, 1.94093E2, 6.4256E1);
        ctx.bezierCurveTo(1.90892E2, 6.5056E1, 1.51692E2, 4.0255E1, 1.45292E2, 4.1055E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.158E2), 1.19601E2);
        ctx.bezierCurveTo((-1.286E2), 9.76E1, (-1.19E2), 1.53201E2, (-1.19E2), 1.53201E2);
        ctx.bezierCurveTo((-1.102E2), 1.87601E2, 2.66E1, 1.35601E2, 2.66E1, 1.35601E2);
        ctx.bezierCurveTo(2.66E1, 1.35601E2, 1.95401E2, 1.052E2, 2.06601E2, 1.012E2);
        ctx.bezierCurveTo(2.17801E2, 9.72E1, 3.03401E2, 1.028E2, 3.03401E2, 1.028E2);
        ctx.lineTo(2.98601E2, 8.04E1);
        ctx.bezierCurveTo(2.33801E2, 3.4E1, 2.23401E2, 6.36E1, 2.09801E2, 5.96E1);
        ctx.bezierCurveTo(1.96201E2, 5.56E1, 1.98601E2, 6.52E1, 1.95401E2, 6.6E1);
        ctx.bezierCurveTo(1.92201E2, 6.68E1, 1.53001E2, 4.2E1, 1.46601E2, 4.28E1);
        ctx.bezierCurveTo(1.40201E2, 4.36E1, 1.14981E2, 1.9793E1, 1.29801E2, 5.16E1);
        ctx.bezierCurveTo(1.52028E2, 9.9307E1, 6.9041E1, 8.9227E1, 5.46E1, 7.96E1);
        ctx.bezierCurveTo(3.78E1, 6.84E1, 6.18E1, 9.8E1, 6.18E1, 9.8E1);
        ctx.bezierCurveTo(8.02E1, 1.18001E2, 4.58E1, 1.012E2, 4.58E1, 1.012E2);
        ctx.bezierCurveTo(1.14E1, 8.84E1, (-1.26E1), 1.14001E2, (-1.58E1), 1.14801E2);
        ctx.bezierCurveTo((-1.9E1), 1.15601E2, (-2.38E1), 1.18801E2, (-2.46E1), 1.12401E2);
        ctx.bezierCurveTo((-2.54E1), 1.06E2, (-3.1465E1), 9.1144E1, (-6.46E1), 1.15601E2);
        ctx.bezierCurveTo((-9.82E1), 1.40401E2, (-1.086E2), 1.24401E2, (-1.086E2), 1.24401E2);
        ctx.lineTo((-1.158E2), 1.19601E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-7.42E1), 1.49601E2);
        ctx.bezierCurveTo((-7.42E1), 1.49601E2, (-8.14E1), 1.61201E2, (-6.06E1), 1.74401E2);
        ctx.bezierCurveTo((-6.06E1), 1.74401E2, (-5.92E1), 1.75801E2, (-7.72E1), 1.71601E2);
        ctx.bezierCurveTo((-7.72E1), 1.71601E2, (-8.34E1), 1.69601E2, (-8.5E1), 1.59201E2);
        ctx.bezierCurveTo((-8.5E1), 1.59201E2, (-8.98E1), 1.54801E2, (-9.46E1), 1.49201E2);
        ctx.bezierCurveTo((-9.94E1), 1.43601E2, (-7.42E1), 1.49601E2, (-7.42E1), 1.49601E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(6.58E1, 1.02E2);
        ctx.bezierCurveTo(6.58E1, 1.02E2, 8.3498E1, 1.28821E2, 8.29E1, 1.33601E2);
        ctx.bezierCurveTo(8.16E1, 1.44001E2, 8.14E1, 1.53601E2, 8.46E1, 1.57601E2);
        ctx.bezierCurveTo(8.7801E1, 1.61601E2, 9.6601E1, 1.94801E2, 9.6601E1, 1.94801E2);
        ctx.bezierCurveTo(9.6601E1, 1.94801E2, 9.6201E1, 1.96001E2, 1.08601E2, 1.58001E2);
        ctx.bezierCurveTo(1.08601E2, 1.58001E2, 1.20201E2, 1.42001E2, 1.00201E2, 1.23601E2);
        ctx.bezierCurveTo(1.00201E2, 1.23601E2, 6.5E1, 9.48E1, 6.58E1, 1.02E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-5.42E1), 1.76401E2);
        ctx.bezierCurveTo((-5.42E1), 1.76401E2, (-4.3E1), 1.83601E2, (-5.74E1), 2.14801E2);
        ctx.lineTo((-5.1E1), 2.12401E2);
        ctx.bezierCurveTo((-5.1E1), 2.12401E2, (-5.18E1), 2.23601E2, (-5.5E1), 2.26001E2);
        ctx.lineTo((-4.78E1), 2.22801E2);
        ctx.bezierCurveTo((-4.78E1), 2.22801E2, (-4.3E1), 2.30801E2, (-4.7E1), 2.35601E2);
        ctx.bezierCurveTo((-4.7E1), 2.35601E2, (-3.02E1), 2.43601E2, (-3.1E1), 2.50001E2);
        ctx.bezierCurveTo((-3.1E1), 2.50001E2, (-2.46E1), 2.42001E2, (-2.86E1), 2.35601E2);
        ctx.bezierCurveTo((-3.26E1), 2.29201E2, (-3.98E1), 2.33201E2, (-3.9E1), 2.14801E2);
        ctx.lineTo((-4.78E1), 2.18001E2);
        ctx.bezierCurveTo((-4.78E1), 2.18001E2, (-4.22E1), 2.09201E2, (-4.22E1), 2.02801E2);
        ctx.lineTo((-5.02E1), 2.05201E2);
        ctx.bezierCurveTo((-5.02E1), 2.05201E2, (-3.4731E1), 1.78623E2, (-4.54E1), 1.77201E2);
        ctx.bezierCurveTo((-5.14E1), 1.76401E2, (-5.42E1), 1.76401E2, (-5.42E1), 1.76401E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-2.18E1), 1.93201E2);
        ctx.bezierCurveTo((-2.18E1), 1.93201E2, (-1.9E1), 1.88801E2, (-2.18E1), 1.89601E2);
        ctx.bezierCurveTo((-2.46E1), 1.90401E2, (-5.58E1), 2.05201E2, (-6.18E1), 2.14801E2);
        ctx.bezierCurveTo((-6.18E1), 2.14801E2, (-2.74E1), 1.90401E2, (-2.18E1), 1.93201E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.14E1), 2.01201E2);
        ctx.bezierCurveTo((-1.14E1), 2.01201E2, (-8.6E0), 1.96801E2, (-1.14E1), 1.97601E2);
        ctx.bezierCurveTo((-1.42E1), 1.98401E2, (-4.54E1), 2.13201E2, (-5.14E1), 2.22801E2);
        ctx.bezierCurveTo((-5.14E1), 2.22801E2, (-1.7E1), 1.98401E2, (-1.14E1), 2.01201E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(1.8E0, 1.86001E2);
        ctx.bezierCurveTo(1.8E0, 1.86001E2, 4.6E0, 1.81601E2, 1.8E0, 1.82401E2);
        ctx.bezierCurveTo((-1E0), 1.83201E2, (-3.22E1), 1.98001E2, (-3.82E1), 2.07601E2);
        ctx.bezierCurveTo((-3.82E1), 2.07601E2, (-3.8E0), 1.83201E2, 1.8E0, 1.86001E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-2.14E1), 2.29601E2);
        ctx.bezierCurveTo((-2.14E1), 2.29601E2, (-2.14E1), 2.23601E2, (-2.42E1), 2.24401E2);
        ctx.bezierCurveTo((-2.7E1), 2.25201E2, (-6.3E1), 2.42801E2, (-6.9E1), 2.52401E2);
        ctx.bezierCurveTo((-6.9E1), 2.52401E2, (-2.7E1), 2.26801E2, (-2.14E1), 2.29601E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-2.02E1), 2.18801E2);
        ctx.bezierCurveTo((-2.02E1), 2.18801E2, (-1.9E1), 2.14001E2, (-2.18E1), 2.14801E2);
        ctx.bezierCurveTo((-2.38E1), 2.14801E2, (-5.02E1), 2.26401E2, (-5.62E1), 2.36001E2);
        ctx.bezierCurveTo((-5.62E1), 2.36001E2, (-2.66E1), 2.14401E2, (-2.02E1), 2.18801E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-3.46E1), 2.66401E2);
        ctx.lineTo((-4.46E1), 2.74001E2);
        ctx.bezierCurveTo((-4.46E1), 2.74001E2, (-3.42E1), 2.66401E2, (-3.06E1), 2.67601E2);
        ctx.bezierCurveTo((-3.06E1), 2.67601E2, (-3.74E1), 2.78801E2, (-3.82E1), 2.84001E2);
        ctx.bezierCurveTo((-3.82E1), 2.84001E2, (-2.78E1), 2.71201E2, (-2.22E1), 2.71601E2);
        ctx.bezierCurveTo((-2.22E1), 2.71601E2, (-1.46E1), 2.72001E2, (-1.46E1), 2.82801E2);
        ctx.bezierCurveTo((-1.46E1), 2.82801E2, (-9E0), 2.72401E2, (-5.8E0), 2.72801E2);
        ctx.bezierCurveTo((-5.8E0), 2.72801E2, (-4.6E0), 2.79201E2, (-5.8E0), 2.86001E2);
        ctx.bezierCurveTo((-5.8E0), 2.86001E2, (-1.8E0), 2.78401E2, 2.2E0, 2.80001E2);
        ctx.bezierCurveTo(2.2E0, 2.80001E2, 8.6E0, 2.78001E2, 7.8E0, 2.89601E2);
        ctx.bezierCurveTo(7.8E0, 2.89601E2, 7.8E0, 3.00001E2, 7E0, 3.02801E2);
        ctx.bezierCurveTo(7E0, 3.02801E2, 1.26E1, 2.76401E2, 1.5E1, 2.76001E2);
        ctx.bezierCurveTo(1.5E1, 2.76001E2, 2.3E1, 2.74801E2, 2.78E1, 2.83601E2);
        ctx.bezierCurveTo(2.78E1, 2.83601E2, 2.38E1, 2.76001E2, 2.86E1, 2.78001E2);
        ctx.bezierCurveTo(2.86E1, 2.78001E2, 3.94E1, 2.79601E2, 4.26E1, 2.86401E2);
        ctx.bezierCurveTo(4.26E1, 2.86401E2, 3.58E1, 2.74401E2, 4.14E1, 2.77601E2);
        ctx.bezierCurveTo(4.14E1, 2.77601E2, 4.82E1, 2.77601E2, 4.94E1, 2.84001E2);
        ctx.bezierCurveTo(4.94E1, 2.84001E2, 5.78E1, 3.05201E2, 5.98E1, 3.06801E2);
        ctx.bezierCurveTo(5.98E1, 3.06801E2, 5.22E1, 2.85201E2, 5.38E1, 2.85201E2);
        ctx.bezierCurveTo(5.38E1, 2.85201E2, 5.18E1, 2.73201E2, 5.7E1, 2.88001E2);
        ctx.bezierCurveTo(5.7E1, 2.88001E2, 5.38E1, 2.74001E2, 5.94E1, 2.74801E2);
        ctx.bezierCurveTo(6.5E1, 2.75601E2, 6.94E1, 2.85601E2, 7.78E1, 2.83201E2);
        ctx.bezierCurveTo(7.78E1, 2.83201E2, 8.7401E1, 2.88801E2, 8.9401E1, 2.19601E2);
        ctx.lineTo((-3.46E1), 2.66401E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-2.98E1), 1.73601E2);
        ctx.bezierCurveTo((-2.98E1), 1.73601E2, (-1.5E1), 1.67601E2, 2.5E1, 1.73601E2);
        ctx.bezierCurveTo(2.5E1, 1.73601E2, 3.22E1, 1.74001E2, 3.9E1, 1.65201E2);
        ctx.bezierCurveTo(4.58E1, 1.56401E2, 7.26E1, 1.49201E2, 7.9E1, 1.51201E2);
        ctx.lineTo(8.8601E1, 1.57601E2);
        ctx.lineTo(8.9401E1, 1.58801E2);
        ctx.bezierCurveTo(8.9401E1, 1.58801E2, 1.01801E2, 1.69201E2, 1.02201E2, 1.76801E2);
        ctx.bezierCurveTo(1.02601E2, 1.84401E2, 8.7801E1, 2.32401E2, 7.82E1, 2.48401E2);
        ctx.bezierCurveTo(6.86E1, 2.64401E2, 5.9E1, 2.76801E2, 3.98E1, 2.74401E2);
        ctx.bezierCurveTo(3.98E1, 2.74401E2, 1.9E1, 2.70401E2, (-6.6E0), 2.74401E2);
        ctx.bezierCurveTo((-6.6E0), 2.74401E2, (-3.58E1), 2.72801E2, (-3.86E1), 2.64801E2);
        ctx.bezierCurveTo((-4.14E1), 2.56801E2, (-2.74E1), 2.41601E2, (-2.74E1), 2.41601E2);
        ctx.bezierCurveTo((-2.74E1), 2.41601E2, (-2.3E1), 2.33201E2, (-2.42E1), 2.18801E2);
        ctx.bezierCurveTo((-2.54E1), 2.04401E2, (-2.5E1), 1.76401E2, (-2.98E1), 1.73601E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#e5668c';
        ctx.fillStyle = 'rgba(229,102,140,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#e5668c';
        ctx.fillStyle = 'rgba(229,102,140,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-7.8E0), 1.75601E2);
        ctx.bezierCurveTo(6E-1, 1.94001E2, (-2.9E1), 2.59201E2, (-2.9E1), 2.59201E2);
        ctx.bezierCurveTo((-3.1E1), 2.60801E2, (-1.634E1), 2.66846E2, (-6.2E0), 2.64401E2);
        ctx.bezierCurveTo(4.746E0, 2.61763E2, 4.5E1, 2.66001E2, 4.5E1, 2.66001E2);
        ctx.bezierCurveTo(6.86E1, 2.50401E2, 8.14E1, 2.06001E2, 8.14E1, 2.06001E2);
        ctx.bezierCurveTo(8.14E1, 2.06001E2, 9.1801E1, 1.82001E2, 7.42E1, 1.78801E2);
        ctx.bezierCurveTo(5.66E1, 1.75601E2, (-7.8E0), 1.75601E2, (-7.8E0), 1.75601E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#b23259';
        ctx.fillStyle = 'rgba(178,50,89,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#b23259';
        ctx.fillStyle = 'rgba(178,50,89,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-9.831E0), 2.06497E2);
        ctx.bezierCurveTo((-6.505E0), 1.93707E2, (-4.921E0), 1.81906E2, (-7.8E0), 1.75601E2);
        ctx.bezierCurveTo((-7.8E0), 1.75601E2, 5.46E1, 1.82001E2, 6.58E1, 1.61201E2);
        ctx.bezierCurveTo(7.0041E1, 1.53326E2, 8.4801E1, 1.84001E2, 8.44E1, 1.93601E2);
        ctx.bezierCurveTo(8.44E1, 1.93601E2, 2.14E1, 2.08001E2, 6.6E0, 1.96801E2);
        ctx.lineTo((-9.831E0), 2.06497E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#a5264c';
        ctx.fillStyle = 'rgba(165,38,76,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#a5264c';
        ctx.fillStyle = 'rgba(165,38,76,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-5.4E0), 2.22801E2);
        ctx.bezierCurveTo((-5.4E0), 2.22801E2, (-3.4E0), 2.30001E2, (-5.8E0), 2.34001E2);
        ctx.bezierCurveTo((-5.8E0), 2.34001E2, (-7.4E0), 2.34801E2, (-8.6E0), 2.35201E2);
        ctx.bezierCurveTo((-8.6E0), 2.35201E2, (-7.4E0), 2.38801E2, (-1.4E0), 2.40401E2);
        ctx.bezierCurveTo((-1.4E0), 2.40401E2, 6E-1, 2.44801E2, 3E0, 2.45201E2);
        ctx.bezierCurveTo(5.4E0, 2.45601E2, 1.02E1, 2.51201E2, 1.42E1, 2.50001E2);
        ctx.bezierCurveTo(1.82E1, 2.48801E2, 2.94E1, 2.44801E2, 2.94E1, 2.44801E2);
        ctx.bezierCurveTo(2.94E1, 2.44801E2, 3.5E1, 2.41601E2, 4.38E1, 2.45201E2);
        ctx.bezierCurveTo(4.38E1, 2.45201E2, 4.6175E1, 2.44399E2, 4.66E1, 2.40401E2);
        ctx.bezierCurveTo(4.71E1, 2.35701E2, 5.02E1, 2.32001E2, 5.22E1, 2.30001E2);
        ctx.bezierCurveTo(5.42E1, 2.28001E2, 6.38E1, 2.15201E2, 6.26E1, 2.14801E2);
        ctx.bezierCurveTo(6.14E1, 2.14401E2, (-5.4E0), 2.22801E2, (-5.4E0), 2.22801E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ff727f';
        ctx.fillStyle = 'rgba(255,114,127,1)';
        ctx.strokeStyle = '#000000';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ff727f';
        ctx.fillStyle = 'rgba(255,114,127,1)';
        ctx.strokeStyle = '#000000';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-9.8E0), 1.74401E2);
        ctx.bezierCurveTo((-9.8E0), 1.74401E2, (-1.26E1), 1.96801E2, (-9.4E0), 2.05201E2);
        ctx.bezierCurveTo((-6.2E0), 2.13601E2, (-7E0), 2.15601E2, (-7.8E0), 2.19601E2);
        ctx.bezierCurveTo((-8.6E0), 2.23601E2, (-4.2E0), 2.33601E2, 1.4E0, 2.39601E2);
        ctx.lineTo(1.34E1, 2.41201E2);
        ctx.bezierCurveTo(1.34E1, 2.41201E2, 2.86E1, 2.37601E2, 3.78E1, 2.40401E2);
        ctx.bezierCurveTo(3.78E1, 2.40401E2, 4.6794E1, 2.41744E2, 5.02E1, 2.26801E2);
        ctx.bezierCurveTo(5.02E1, 2.26801E2, 5.5E1, 2.20401E2, 6.22E1, 2.17601E2);
        ctx.bezierCurveTo(6.94E1, 2.14801E2, 7.66E1, 1.73201E2, 7.26E1, 1.65201E2);
        ctx.bezierCurveTo(6.86E1, 1.57201E2, 5.42E1, 1.52801E2, 3.82E1, 1.68401E2);
        ctx.bezierCurveTo(2.22E1, 1.84001E2, 2.02E1, 1.67201E2, (-9.8E0), 1.74401E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffcc';
        ctx.fillStyle = 'rgba(255,255,204,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffcc';
        ctx.fillStyle = 'rgba(255,255,204,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-8.2E0), 2.49201E2);
        ctx.bezierCurveTo((-8.2E0), 2.49201E2, (-9E0), 2.47201E2, (-1.34E1), 2.46801E2);
        ctx.bezierCurveTo((-1.34E1), 2.46801E2, (-3.58E1), 2.43201E2, (-4.42E1), 2.30801E2);
        ctx.bezierCurveTo((-4.42E1), 2.30801E2, (-5.1E1), 2.25201E2, (-4.66E1), 2.36801E2);
        ctx.bezierCurveTo((-4.66E1), 2.36801E2, (-3.62E1), 2.57201E2, (-2.94E1), 2.60001E2);
        ctx.bezierCurveTo((-2.94E1), 2.60001E2, (-1.3E1), 2.64001E2, (-8.2E0), 2.49201E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cc3f4c';
        ctx.fillStyle = 'rgba(204,63,76,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cc3f4c';
        ctx.fillStyle = 'rgba(204,63,76,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(7.1742E1, 1.85229E2);
        ctx.bezierCurveTo(7.2401E1, 1.77323E2, 7.4354E1, 1.68709E2, 7.26E1, 1.65201E2);
        ctx.bezierCurveTo(6.6154E1, 1.52307E2, 4.9181E1, 1.57695E2, 3.82E1, 1.68401E2);
        ctx.bezierCurveTo(2.22E1, 1.84001E2, 2.02E1, 1.67201E2, (-9.8E0), 1.74401E2);
        ctx.bezierCurveTo((-9.8E0), 1.74401E2, (-1.1545E1), 1.88364E2, (-1.0705E1), 1.98376E2);
        ctx.bezierCurveTo((-1.0705E1), 1.98376E2, 2.66E1, 1.86801E2, 2.74E1, 1.92401E2);
        ctx.bezierCurveTo(2.74E1, 1.92401E2, 2.9E1, 1.89201E2, 3.82E1, 1.89201E2);
        ctx.bezierCurveTo(4.74E1, 1.89201E2, 7.0142E1, 1.88029E2, 7.1742E1, 1.85229E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.strokeStyle = '#a51926';
        ctx.lineWidth = 2E0;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.strokeStyle = '#a51926';
        ctx.lineWidth = 2E0;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(2.86E1, 1.75201E2);
        ctx.bezierCurveTo(2.86E1, 1.75201E2, 3.34E1, 1.80001E2, 2.98E1, 1.89601E2);
        ctx.bezierCurveTo(2.98E1, 1.89601E2, 1.54E1, 2.05601E2, 1.74E1, 2.19601E2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffcc';
        ctx.fillStyle = 'rgba(255,255,204,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffcc';
        ctx.fillStyle = 'rgba(255,255,204,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.94E1), 2.60001E2);
        ctx.bezierCurveTo((-1.94E1), 2.60001E2, (-2.38E1), 2.47201E2, (-1.5E1), 2.54001E2);
        ctx.bezierCurveTo((-1.5E1), 2.54001E2, (-1.02E1), 2.56001E2, (-1.14E1), 2.57601E2);
        ctx.bezierCurveTo((-1.26E1), 2.59201E2, (-1.82E1), 2.63201E2, (-1.94E1), 2.60001E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffcc';
        ctx.fillStyle = 'rgba(255,255,204,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffcc';
        ctx.fillStyle = 'rgba(255,255,204,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.436E1), 2.61201E2);
        ctx.bezierCurveTo((-1.436E1), 2.61201E2, (-1.788E1), 2.50961E2, (-1.084E1), 2.56401E2);
        ctx.bezierCurveTo((-1.084E1), 2.56401E2, (-6.419E0), 2.58849E2, (-7.96E0), 2.59281E2);
        ctx.bezierCurveTo((-1.252E1), 2.60561E2, (-7.96E0), 2.63121E2, (-1.436E1), 2.61201E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffcc';
        ctx.fillStyle = 'rgba(255,255,204,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffcc';
        ctx.fillStyle = 'rgba(255,255,204,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-9.56E0), 2.61201E2);
        ctx.bezierCurveTo((-9.56E0), 2.61201E2, (-1.308E1), 2.50961E2, (-6.04E0), 2.56401E2);
        ctx.bezierCurveTo((-6.04E0), 2.56401E2, (-1.665E0), 2.58711E2, (-3.16E0), 2.59281E2);
        ctx.bezierCurveTo((-6.52E0), 2.60561E2, (-3.16E0), 2.63121E2, (-9.56E0), 2.61201E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffcc';
        ctx.fillStyle = 'rgba(255,255,204,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffcc';
        ctx.fillStyle = 'rgba(255,255,204,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-2.96E0), 2.61401E2);
        ctx.bezierCurveTo((-2.96E0), 2.61401E2, (-6.48E0), 2.51161E2, 5.6E-1, 2.56601E2);
        ctx.bezierCurveTo(5.6E-1, 2.56601E2, 4.943E0, 2.58933E2, 3.441E0, 2.59481E2);
        ctx.bezierCurveTo(4.8E-1, 2.60561E2, 3.441E0, 2.63321E2, (-2.96E0), 2.61401E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffcc';
        ctx.fillStyle = 'rgba(255,255,204,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffcc';
        ctx.fillStyle = 'rgba(255,255,204,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(3.52E0, 2.61321E2);
        ctx.bezierCurveTo(3.52E0, 2.61321E2, 0E0, 2.51081E2, 7.041E0, 2.56521E2);
        ctx.bezierCurveTo(7.041E0, 2.56521E2, 1.0881E1, 2.58121E2, 9.921E0, 2.59401E2);
        ctx.bezierCurveTo(8.961E0, 2.60681E2, 9.921E0, 2.63241E2, 3.52E0, 2.61321E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffcc';
        ctx.fillStyle = 'rgba(255,255,204,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffcc';
        ctx.fillStyle = 'rgba(255,255,204,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(1.02E1, 2.62001E2);
        ctx.bezierCurveTo(1.02E1, 2.62001E2, 5.4E0, 2.49601E2, 1.46E1, 2.56001E2);
        ctx.bezierCurveTo(1.46E1, 2.56001E2, 1.94E1, 2.58001E2, 1.82E1, 2.59601E2);
        ctx.bezierCurveTo(1.7E1, 2.61201E2, 1.82E1, 2.64401E2, 1.02E1, 2.62001E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.strokeStyle = '#a5264c';
        ctx.lineWidth = 2E0;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.strokeStyle = '#a5264c';
        ctx.lineWidth = 2E0;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.82E1), 2.44801E2);
        ctx.bezierCurveTo((-1.82E1), 2.44801E2, (-5E0), 2.42001E2, 1E0, 2.45201E2);
        ctx.bezierCurveTo(1E0, 2.45201E2, 7E0, 2.46401E2, 8.2E0, 2.46001E2);
        ctx.bezierCurveTo(9.4E0, 2.45601E2, 1.26E1, 2.45201E2, 1.26E1, 2.45201E2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.strokeStyle = '#a5264c';
        ctx.lineWidth = 2E0;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.strokeStyle = '#a5264c';
        ctx.lineWidth = 2E0;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(1.58E1, 2.53601E2);
        ctx.bezierCurveTo(1.58E1, 2.53601E2, 2.78E1, 2.40001E2, 3.98E1, 2.44401E2);
        ctx.bezierCurveTo(4.6816E1, 2.46974E2, 4.58E1, 2.43601E2, 4.66E1, 2.40801E2);
        ctx.bezierCurveTo(4.74E1, 2.38001E2, 4.76E1, 2.33801E2, 5.26E1, 2.30801E2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffcc';
        ctx.fillStyle = 'rgba(255,255,204,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffcc';
        ctx.fillStyle = 'rgba(255,255,204,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(3.3E1, 2.37601E2);
        ctx.bezierCurveTo(3.3E1, 2.37601E2, 2.9E1, 2.26801E2, 2.62E1, 2.39601E2);
        ctx.bezierCurveTo(2.34E1, 2.52401E2, 2.02E1, 2.56001E2, 1.86E1, 2.58801E2);
        ctx.bezierCurveTo(1.86E1, 2.58801E2, 1.86E1, 2.64001E2, 2.7E1, 2.63601E2);
        ctx.bezierCurveTo(2.7E1, 2.63601E2, 3.78E1, 2.63201E2, 3.82E1, 2.60401E2);
        ctx.bezierCurveTo(3.86E1, 2.57601E2, 3.7E1, 2.46001E2, 3.3E1, 2.37601E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.strokeStyle = '#a5264c';
        ctx.lineWidth = 2E0;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.strokeStyle = '#a5264c';
        ctx.lineWidth = 2E0;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(4.7E1, 2.44801E2);
        ctx.bezierCurveTo(4.7E1, 2.44801E2, 5.06E1, 2.42401E2, 5.3E1, 2.43601E2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.strokeStyle = '#a5264c';
        ctx.lineWidth = 2E0;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.strokeStyle = '#a5264c';
        ctx.lineWidth = 2E0;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(5.35E1, 2.28401E2);
        ctx.bezierCurveTo(5.35E1, 2.28401E2, 5.64E1, 2.23501E2, 6.12E1, 2.22701E2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#b2b2b2';
        ctx.fillStyle = 'rgba(178,178,178,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#b2b2b2';
        ctx.fillStyle = 'rgba(178,178,178,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-2.58E1), 2.65201E2);
        ctx.bezierCurveTo((-2.58E1), 2.65201E2, (-7.8E0), 2.68401E2, (-3.4E0), 2.66801E2);
        ctx.bezierCurveTo((-3.4E0), 2.66801E2, 5.4E0, 2.66801E2, (-3E0), 2.68801E2);
        ctx.bezierCurveTo((-3E0), 2.68801E2, (-1.58E1), 2.68801E2, (-2.38E1), 2.67601E2);
        ctx.bezierCurveTo((-2.38E1), 2.67601E2, (-3.54E1), 2.62001E2, (-2.58E1), 2.65201E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffcc';
        ctx.fillStyle = 'rgba(255,255,204,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffcc';
        ctx.fillStyle = 'rgba(255,255,204,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.18E1), 1.72001E2);
        ctx.bezierCurveTo((-1.18E1), 1.72001E2, 5.8E0, 1.72001E2, 7.8E0, 1.72801E2);
        ctx.bezierCurveTo(7.8E0, 1.72801E2, 1.5E1, 2.03601E2, 1.14E1, 2.11201E2);
        ctx.bezierCurveTo(1.14E1, 2.11201E2, 1.02E1, 2.14001E2, 7.4E0, 2.08401E2);
        ctx.bezierCurveTo(7.4E0, 2.08401E2, (-1.1E1), 1.75601E2, (-1.42E1), 1.73601E2);
        ctx.bezierCurveTo((-1.74E1), 1.71601E2, (-1.3E1), 1.72001E2, (-1.18E1), 1.72001E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffcc';
        ctx.fillStyle = 'rgba(255,255,204,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffcc';
        ctx.fillStyle = 'rgba(255,255,204,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-8.89E1), 1.69301E2);
        ctx.bezierCurveTo((-8.89E1), 1.69301E2, (-8E1), 1.71001E2, (-6.74E1), 1.73601E2);
        ctx.bezierCurveTo((-6.74E1), 1.73601E2, (-6.26E1), 1.96001E2, (-5.94E1), 2.00801E2);
        ctx.bezierCurveTo((-5.62E1), 2.05601E2, (-5.98E1), 2.05601E2, (-6.34E1), 2.02801E2);
        ctx.bezierCurveTo((-6.7E1), 2.00001E2, (-8.18E1), 1.86001E2, (-8.38E1), 1.81601E2);
        ctx.bezierCurveTo((-8.58E1), 1.77201E2, (-8.89E1), 1.69301E2, (-8.89E1), 1.69301E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffcc';
        ctx.fillStyle = 'rgba(255,255,204,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffcc';
        ctx.fillStyle = 'rgba(255,255,204,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-6.7039E1), 1.73818E2);
        ctx.bezierCurveTo((-6.7039E1), 1.73818E2, (-6.1239E1), 1.75366E2, (-6.023E1), 1.77581E2);
        ctx.bezierCurveTo((-5.9222E1), 1.79795E2, (-6.1432E1), 1.83092E2, (-6.1432E1), 1.83092E2);
        ctx.bezierCurveTo((-6.1432E1), 1.83092E2, (-6.2432E1), 1.86397E2, (-6.3634E1), 1.84235E2);
        ctx.bezierCurveTo((-6.4836E1), 1.82072E2, (-6.7708E1), 1.74412E2, (-6.7039E1), 1.73818E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-6.7E1), 1.73601E2);
        ctx.bezierCurveTo((-6.7E1), 1.73601E2, (-6.34E1), 1.78801E2, (-5.98E1), 1.78801E2);
        ctx.bezierCurveTo((-5.62E1), 1.78801E2, (-5.5818E1), 1.78388E2, (-5.3E1), 1.79001E2);
        ctx.bezierCurveTo((-4.84E1), 1.80001E2, (-4.88E1), 1.78001E2, (-4.22E1), 1.79201E2);
        ctx.bezierCurveTo((-3.956E1), 1.79681E2, (-3.7E1), 1.78801E2, (-3.42E1), 1.80001E2);
        ctx.bezierCurveTo((-3.14E1), 1.81201E2, (-2.82E1), 1.80401E2, (-2.7E1), 1.78401E2);
        ctx.bezierCurveTo((-2.58E1), 1.76401E2, (-2.1E1), 1.72201E2, (-2.1E1), 1.72201E2);
        ctx.bezierCurveTo((-2.1E1), 1.72201E2, (-3.38E1), 1.74001E2, (-3.66E1), 1.74801E2);
        ctx.bezierCurveTo((-3.66E1), 1.74801E2, (-5.9E1), 1.76001E2, (-6.7E1), 1.73601E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffcc';
        ctx.fillStyle = 'rgba(255,255,204,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffcc';
        ctx.fillStyle = 'rgba(255,255,204,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-2.24E1), 1.73801E2);
        ctx.bezierCurveTo((-2.24E1), 1.73801E2, (-2.885E1), 1.77301E2, (-2.925E1), 1.79701E2);
        ctx.bezierCurveTo((-2.965E1), 1.82101E2, (-2.4E1), 1.85801E2, (-2.4E1), 1.85801E2);
        ctx.bezierCurveTo((-2.4E1), 1.85801E2, (-2.125E1), 1.90401E2, (-2.065E1), 1.88001E2);
        ctx.bezierCurveTo((-2.005E1), 1.85601E2, (-2.16E1), 1.74201E2, (-2.24E1), 1.73801E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffcc';
        ctx.fillStyle = 'rgba(255,255,204,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffcc';
        ctx.fillStyle = 'rgba(255,255,204,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-5.9885E1), 1.79265E2);
        ctx.bezierCurveTo((-5.9885E1), 1.79265E2, (-5.2878E1), 1.90453E2, (-5.2661E1), 1.79242E2);
        ctx.bezierCurveTo((-5.2661E1), 1.79242E2, (-5.2104E1), 1.77984E2, (-5.3864E1), 1.77962E2);
        ctx.bezierCurveTo((-5.9939E1), 1.77886E2, (-5.8418E1), 1.73784E2, (-5.9885E1), 1.79265E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffcc';
        ctx.fillStyle = 'rgba(255,255,204,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffcc';
        ctx.fillStyle = 'rgba(255,255,204,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-5.2707E1), 1.79514E2);
        ctx.bezierCurveTo((-5.2707E1), 1.79514E2, (-4.4786E1), 1.90701E2, (-4.5422E1), 1.79421E2);
        ctx.bezierCurveTo((-4.5422E1), 1.79421E2, (-4.5415E1), 1.79089E2, (-4.7168E1), 1.78936E2);
        ctx.bezierCurveTo((-5.1915E1), 1.78522E2, (-5.157E1), 1.74004E2, (-5.2707E1), 1.79514E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffcc';
        ctx.fillStyle = 'rgba(255,255,204,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffcc';
        ctx.fillStyle = 'rgba(255,255,204,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-4.5494E1), 1.79522E2);
        ctx.bezierCurveTo((-4.5494E1), 1.79522E2, (-3.7534E1), 1.9015E2, (-3.8203E1), 1.80484E2);
        ctx.bezierCurveTo((-3.8203E1), 1.80484E2, (-3.8084E1), 1.79251E2, (-3.9738E1), 1.7895E2);
        ctx.bezierCurveTo((-4.363E1), 1.78244E2, (-4.3841E1), 1.74995E2, (-4.5494E1), 1.79522E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffcc';
        ctx.fillStyle = 'rgba(255,255,204,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffcc';
        ctx.fillStyle = 'rgba(255,255,204,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-3.8618E1), 1.79602E2);
        ctx.bezierCurveTo((-3.8618E1), 1.79602E2, (-3.0718E1), 1.91163E2, (-3.037E1), 1.81382E2);
        ctx.bezierCurveTo((-3.037E1), 1.81382E2, (-2.8726E1), 1.80004E2, (-3.0472E1), 1.79782E2);
        ctx.bezierCurveTo((-3.629E1), 1.79042E2, (-3.5492E1), 1.74588E2, (-3.8618E1), 1.79602E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#e5e5b2';
        ctx.fillStyle = 'rgba(229,229,178,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#e5e5b2';
        ctx.fillStyle = 'rgba(229,229,178,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-7.4792E1), 1.83132E2);
        ctx.lineTo((-8.245E1), 1.81601E2);
        ctx.bezierCurveTo((-8.505E1), 1.76601E2, (-8.715E1), 1.70451E2, (-8.715E1), 1.70451E2);
        ctx.bezierCurveTo((-8.715E1), 1.70451E2, (-8.08E1), 1.71451E2, (-6.83E1), 1.74251E2);
        ctx.bezierCurveTo((-6.83E1), 1.74251E2, (-6.7424E1), 1.77569E2, (-6.5952E1), 1.83364E2);
        ctx.lineTo((-7.4792E1), 1.83132E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#e5e5b2';
        ctx.fillStyle = 'rgba(229,229,178,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#e5e5b2';
        ctx.fillStyle = 'rgba(229,229,178,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-9.724E0), 1.7847E2);
        ctx.bezierCurveTo((-1.139E1), 1.75964E2, (-1.2707E1), 1.74206E2, (-1.3357E1), 1.738E2);
        ctx.bezierCurveTo((-1.637E1), 1.71917E2, (-1.2227E1), 1.72294E2, (-1.1098E1), 1.72294E2);
        ctx.bezierCurveTo((-1.1098E1), 1.72294E2, 5.473E0, 1.72294E2, 7.356E0, 1.73047E2);
        ctx.bezierCurveTo(7.356E0, 1.73047E2, 7.88E0, 1.75289E2, 8.564E0, 1.7868E2);
        ctx.bezierCurveTo(8.564E0, 1.7868E2, (-1.524E0), 1.7667E2, (-9.724E0), 1.7847E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cc7226';
        ctx.fillStyle = 'rgba(204,114,38,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cc7226';
        ctx.fillStyle = 'rgba(204,114,38,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(4.388E1, 4.0321E1);
        ctx.bezierCurveTo(7.1601E1, 4.4281E1, 9.7121E1, 8.641E0, 9.8881E1, (-1.04E0));
        ctx.bezierCurveTo(1.00641E2, (-1.072E1), 9.0521E1, (-2.26E1), 9.0521E1, (-2.26E1));
        ctx.bezierCurveTo(9.1841E1, (-2.568E1), 8.7001E1, (-3.976E1), 8.1721E1, (-4.9E1));
        ctx.bezierCurveTo(7.6441E1, (-5.824E1), 6.054E1, (-5.7266E1), 4.3E1, (-5.824E1));
        ctx.bezierCurveTo(2.716E1, (-5.912E1), 8.68E0, (-3.58E1), 7.36E0, (-3.404E1));
        ctx.bezierCurveTo(6.04E0, (-3.228E1), 1.22E1, 6.001E0, 1.352E1, 1.1721E1);
        ctx.bezierCurveTo(1.484E1, 1.7441E1, 1.22E1, 4.3841E1, 1.22E1, 4.3841E1);
        ctx.bezierCurveTo(4.644E1, 3.4741E1, 1.616E1, 3.6361E1, 4.388E1, 4.0321E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ea8e51';
        ctx.fillStyle = 'rgba(234,142,81,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ea8e51';
        ctx.fillStyle = 'rgba(234,142,81,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(8.088E0, (-3.3392E1));
        ctx.bezierCurveTo(6.792E0, (-3.1664E1), 1.284E1, 5.921E0, 1.4136E1, 1.1537E1);
        ctx.bezierCurveTo(1.5432E1, 1.7153E1, 1.284E1, 4.3073E1, 1.284E1, 4.3073E1);
        ctx.bezierCurveTo(4.5512E1, 3.4193E1, 1.6728E1, 3.5729E1, 4.3944E1, 3.9617E1);
        ctx.bezierCurveTo(7.1161E1, 4.3505E1, 9.6217E1, 8.513E0, 9.7945E1, (-9.92E-1));
        ctx.bezierCurveTo(9.9673E1, (-1.0496E1), 8.9737E1, (-2.216E1), 8.9737E1, (-2.216E1));
        ctx.bezierCurveTo(9.1033E1, (-2.5184E1), 8.6281E1, (-3.9008E1), 8.1097E1, (-4.808E1));
        ctx.bezierCurveTo(7.5913E1, (-5.7152E1), 6.0302E1, (-5.6195E1), 4.308E1, (-5.7152E1));
        ctx.bezierCurveTo(2.7528E1, (-5.8016E1), 9.384E0, (-3.512E1), 8.088E0, (-3.3392E1));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#efaa7c';
        ctx.fillStyle = 'rgba(239,170,124,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#efaa7c';
        ctx.fillStyle = 'rgba(239,170,124,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(8.816E0, (-3.2744E1));
        ctx.bezierCurveTo(7.544E0, (-3.1048E1), 1.348E1, 5.841E0, 1.4752E1, 1.1353E1);
        ctx.bezierCurveTo(1.6024E1, 1.6865E1, 1.348E1, 4.2305E1, 1.348E1, 4.2305E1);
        ctx.bezierCurveTo(4.4884E1, 3.3145E1, 1.7296E1, 3.5097E1, 4.4008E1, 3.8913E1);
        ctx.bezierCurveTo(7.0721E1, 4.2729E1, 9.5313E1, 8.385E0, 9.7009E1, (-9.44E-1));
        ctx.bezierCurveTo(9.8705E1, (-1.0272E1), 8.8953E1, (-2.172E1), 8.8953E1, (-2.172E1));
        ctx.bezierCurveTo(9.0225E1, (-2.4688E1), 8.5561E1, (-3.8256E1), 8.0473E1, (-4.716E1));
        ctx.bezierCurveTo(7.5385E1, (-5.6064E1), 6.0063E1, (-5.5125E1), 4.316E1, (-5.6064E1));
        ctx.bezierCurveTo(2.7896E1, (-5.6912E1), 1.0088E1, (-3.444E1), 8.816E0, (-3.2744E1));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#f4c6a8';
        ctx.fillStyle = 'rgba(244,198,168,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#f4c6a8';
        ctx.fillStyle = 'rgba(244,198,168,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(9.544E0, (-3.2096E1));
        ctx.bezierCurveTo(8.296E0, (-3.0432E1), 1.412E1, 5.761E0, 1.5368E1, 1.1169E1);
        ctx.bezierCurveTo(1.6616E1, 1.6577E1, 1.412E1, 4.1537E1, 1.412E1, 4.1537E1);
        ctx.bezierCurveTo(4.3556E1, 3.2497E1, 1.7864E1, 3.4465E1, 4.4072E1, 3.8209E1);
        ctx.bezierCurveTo(7.0281E1, 4.1953E1, 9.4409E1, 8.257E0, 9.6073E1, (-8.95E-1));
        ctx.bezierCurveTo(9.7737E1, (-1.0048E1), 8.8169E1, (-2.128E1), 8.8169E1, (-2.128E1));
        ctx.bezierCurveTo(8.9417E1, (-2.4192E1), 8.4841E1, (-3.7504E1), 7.9849E1, (-4.624E1));
        ctx.bezierCurveTo(7.4857E1, (-5.4976E1), 5.9824E1, (-5.4055E1), 4.324E1, (-5.4976E1));
        ctx.bezierCurveTo(2.8264E1, (-5.5808E1), 1.0792E1, (-3.376E1), 9.544E0, (-3.2096E1));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#f9e2d3';
        ctx.fillStyle = 'rgba(249,226,211,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#f9e2d3';
        ctx.fillStyle = 'rgba(249,226,211,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(1.0272E1, (-3.1448E1));
        ctx.bezierCurveTo(9.048E0, (-2.9816E1), 1.476E1, 5.681E0, 1.5984E1, 1.0985E1);
        ctx.bezierCurveTo(1.7208E1, 1.6289E1, 1.476E1, 4.0769E1, 1.476E1, 4.0769E1);
        ctx.bezierCurveTo(4.2628E1, 3.1849E1, 1.8432E1, 3.3833E1, 4.4136E1, 3.7505E1);
        ctx.bezierCurveTo(6.9841E1, 4.1177E1, 9.3505E1, 8.129E0, 9.5137E1, (-8.48E-1));
        ctx.bezierCurveTo(9.6769E1, (-9.824E0), 8.7385E1, (-2.084E1), 8.7385E1, (-2.084E1));
        ctx.bezierCurveTo(8.8609E1, (-2.3696E1), 8.4121E1, (-3.6752E1), 7.9225E1, (-4.532E1));
        ctx.bezierCurveTo(7.4329E1, (-5.3888E1), 5.9585E1, (-5.2985E1), 4.332E1, (-5.3888E1));
        ctx.bezierCurveTo(2.8632E1, (-5.4704E1), 1.1496E1, (-3.308E1), 1.0272E1, (-3.1448E1));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(4.42E1, 3.68E1);
        ctx.bezierCurveTo(6.94E1, 4.04E1, 9.2601E1, 8E0, 9.4201E1, (-8E-1));
        ctx.bezierCurveTo(9.5801E1, (-9.6E0), 8.6601E1, (-2.04E1), 8.6601E1, (-2.04E1));
        ctx.bezierCurveTo(8.7801E1, (-2.32E1), 8.34E1, (-3.6E1), 7.86E1, (-4.44E1));
        ctx.bezierCurveTo(7.38E1, (-5.28E1), 5.9346E1, (-5.1914E1), 4.34E1, (-5.28E1));
        ctx.bezierCurveTo(2.9E1, (-5.36E1), 1.22E1, (-3.24E1), 1.1E1, (-3.08E1));
        ctx.bezierCurveTo(9.8E0, (-2.92E1), 1.54E1, 5.6E0, 1.66E1, 1.08E1);
        ctx.bezierCurveTo(1.78E1, 1.6E1, 1.54E1, 4E1, 1.54E1, 4E1);
        ctx.bezierCurveTo(4.09E1, 3.14E1, 1.9E1, 3.32E1, 4.42E1, 3.68E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(9.0601E1, 2.8E0);
        ctx.bezierCurveTo(9.0601E1, 2.8E0, 6.28E1, 1.04E1, 5.12E1, 8.8E0);
        ctx.bezierCurveTo(5.12E1, 8.8E0, 3.54E1, 2.2E0, 2.66E1, 2.4E1);
        ctx.bezierCurveTo(2.66E1, 2.4E1, 2.3E1, 3.12E1, 2.1E1, 3.32E1);
        ctx.bezierCurveTo(1.9E1, 3.52E1, 9.0601E1, 2.8E0, 9.0601E1, 2.8E0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(9.4401E1, 6E-1);
        ctx.bezierCurveTo(9.4401E1, 6E-1, 6.54E1, 1.28E1, 5.54E1, 1.24E1);
        ctx.bezierCurveTo(5.54E1, 1.24E1, 3.9E1, 7.8E0, 3.06E1, 2.24E1);
        ctx.bezierCurveTo(3.06E1, 2.24E1, 2.22E1, 3.16E1, 1.9E1, 3.32E1);
        ctx.bezierCurveTo(1.9E1, 3.32E1, 1.86E1, 3.48E1, 2.5E1, 3.08E1);
        ctx.lineTo(3.54E1, 3.6E1);
        ctx.bezierCurveTo(3.54E1, 3.6E1, 5.02E1, 4.56E1, 5.98E1, 2.96E1);
        ctx.bezierCurveTo(5.98E1, 2.96E1, 6.38E1, 1.84E1, 6.38E1, 1.64E1);
        ctx.bezierCurveTo(6.38E1, 1.44E1, 8.5E1, 8.8E0, 8.6601E1, 8.4E0);
        ctx.bezierCurveTo(8.8201E1, 8E0, 9.4801E1, 3.8E0, 9.4401E1, 6E-1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#99cc32';
        ctx.fillStyle = 'rgba(153,204,50,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#99cc32';
        ctx.fillStyle = 'rgba(153,204,50,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(4.7E1, 3.6514E1);
        ctx.bezierCurveTo(4.0128E1, 3.6514E1, 3.1755E1, 3.2649E1, 3.1755E1, 2.64E1);
        ctx.bezierCurveTo(3.1755E1, 2.0152E1, 4.0128E1, 1.3887E1, 4.7E1, 1.3887E1);
        ctx.bezierCurveTo(5.3874E1, 1.3887E1, 5.9446E1, 1.8952E1, 5.9446E1, 2.52E1);
        ctx.bezierCurveTo(5.9446E1, 3.1449E1, 5.3874E1, 3.6514E1, 4.7E1, 3.6514E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#659900';
        ctx.fillStyle = 'rgba(101,153,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#659900';
        ctx.fillStyle = 'rgba(101,153,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(4.3377E1, 1.983E1);
        ctx.bezierCurveTo(3.8531E1, 2.0552E1, 3.3442E1, 2.2055E1, 3.3514E1, 2.1839E1);
        ctx.bezierCurveTo(3.5054E1, 1.722E1, 4.1415E1, 1.3887E1, 4.7E1, 1.3887E1);
        ctx.bezierCurveTo(5.1296E1, 1.3887E1, 5.5084E1, 1.5865E1, 5.732E1, 1.8875E1);
        ctx.bezierCurveTo(5.732E1, 1.8875E1, 5.2004E1, 1.8545E1, 4.3377E1, 1.983E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(5.54E1, 1.96E1);
        ctx.bezierCurveTo(5.54E1, 1.96E1, 5.1E1, 1.64E1, 5.1E1, 1.86E1);
        ctx.bezierCurveTo(5.1E1, 1.86E1, 5.46E1, 2.3E1, 5.54E1, 1.96E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(4.54E1, 2.7726E1);
        ctx.bezierCurveTo(4.2901E1, 2.7726E1, 4.0875E1, 2.57E1, 4.0875E1, 2.32E1);
        ctx.bezierCurveTo(4.0875E1, 2.0701E1, 4.2901E1, 1.8675E1, 4.54E1, 1.8675E1);
        ctx.bezierCurveTo(4.79E1, 1.8675E1, 4.9926E1, 2.0701E1, 4.9926E1, 2.32E1);
        ctx.bezierCurveTo(4.9926E1, 2.57E1, 4.79E1, 2.7726E1, 4.54E1, 2.7726E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cc7226';
        ctx.fillStyle = 'rgba(204,114,38,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cc7226';
        ctx.fillStyle = 'rgba(204,114,38,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-5.86E1), 1.44E1);
        ctx.bezierCurveTo((-5.86E1), 1.44E1, (-6.18E1), (-6.8E0), (-5.94E1), (-1.12E1));
        ctx.bezierCurveTo((-5.94E1), (-1.12E1), (-4.86E1), (-2.12E1), (-4.9E1), (-2.48E1));
        ctx.bezierCurveTo((-4.9E1), (-2.48E1), (-4.94E1), (-4.28E1), (-5.06E1), (-4.36E1));
        ctx.bezierCurveTo((-5.18E1), (-4.44E1), (-5.94E1), (-5.04E1), (-6.54E1), (-4.4E1));
        ctx.bezierCurveTo((-6.54E1), (-4.4E1), (-7.58E1), (-2.6E1), (-7.5E1), (-1.96E1));
        ctx.lineTo((-7.5E1), (-1.76E1));
        ctx.bezierCurveTo((-7.5E1), (-1.76E1), (-8.26E1), (-1.8E1), (-8.42E1), (-1.6E1));
        ctx.bezierCurveTo((-8.42E1), (-1.6E1), (-8.54E1), (-1.08E1), (-8.66E1), (-1.04E1));
        ctx.bezierCurveTo((-8.66E1), (-1.04E1), (-8.94E1), (-8E0), (-8.74E1), (-5.2E0));
        ctx.bezierCurveTo((-8.74E1), (-5.2E0), (-8.94E1), (-2.8E0), (-8.9E1), 1.2E0);
        ctx.lineTo((-8.14E1), 5.2E0);
        ctx.bezierCurveTo((-8.14E1), 5.2E0, (-7.94E1), 1.96E1, (-6.86E1), 2.48E1);
        ctx.bezierCurveTo((-6.3764E1), 2.7129E1, (-6.06E1), 2.04E1, (-5.86E1), 1.44E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-5.96E1), 1.256E1);
        ctx.bezierCurveTo((-5.96E1), 1.256E1, (-6.248E1), (-6.52E0), (-6.032E1), (-1.048E1));
        ctx.bezierCurveTo((-6.032E1), (-1.048E1), (-5.06E1), (-1.948E1), (-5.096E1), (-2.272E1));
        ctx.bezierCurveTo((-5.096E1), (-2.272E1), (-5.132E1), (-3.892E1), (-5.24E1), (-3.964E1));
        ctx.bezierCurveTo((-5.348E1), (-4.036E1), (-6.032E1), (-4.576E1), (-6.572E1), (-4E1));
        ctx.bezierCurveTo((-6.572E1), (-4E1), (-7.508E1), (-2.38E1), (-7.436E1), (-1.804E1));
        ctx.lineTo((-7.436E1), (-1.624E1));
        ctx.bezierCurveTo((-7.436E1), (-1.624E1), (-8.12E1), (-1.66E1), (-8.264E1), (-1.48E1));
        ctx.bezierCurveTo((-8.264E1), (-1.48E1), (-8.372E1), (-1.012E1), (-8.48E1), (-9.76E0));
        ctx.bezierCurveTo((-8.48E1), (-9.76E0), (-8.732E1), (-7.6E0), (-8.552E1), (-5.08E0));
        ctx.bezierCurveTo((-8.552E1), (-5.08E0), (-8.732E1), (-2.92E0), (-8.696E1), 6.8E-1);
        ctx.lineTo((-8.012E1), 4.28E0);
        ctx.bezierCurveTo((-8.012E1), 4.28E0, (-7.832E1), 1.724E1, (-6.86E1), 2.192E1);
        ctx.bezierCurveTo((-6.4248E1), 2.4015E1, (-6.14E1), 1.796E1, (-5.96E1), 1.256E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#eb955c';
        ctx.fillStyle = 'rgba(235,149,92,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#eb955c';
        ctx.fillStyle = 'rgba(235,149,92,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-5.105E1), (-4.261E1));
        ctx.bezierCurveTo((-5.214E1), (-4.347E1), (-5.963E1), (-4.924E1), (-6.548E1), (-4.3E1));
        ctx.bezierCurveTo((-6.548E1), (-4.3E1), (-7.562E1), (-2.545E1), (-7.484E1), (-1.921E1));
        ctx.lineTo((-7.484E1), (-1.726E1));
        ctx.bezierCurveTo((-7.484E1), (-1.726E1), (-8.225E1), (-1.765E1), (-8.381E1), (-1.57E1));
        ctx.bezierCurveTo((-8.381E1), (-1.57E1), (-8.498E1), (-1.063E1), (-8.615E1), (-1.024E1));
        ctx.bezierCurveTo((-8.615E1), (-1.024E1), (-8.888E1), (-7.9E0), (-8.693E1), (-5.17E0));
        ctx.bezierCurveTo((-8.693E1), (-5.17E0), (-8.888E1), (-2.83E0), (-8.849E1), 1.07E0);
        ctx.lineTo((-8.108E1), 4.97E0);
        ctx.bezierCurveTo((-8.108E1), 4.97E0, (-7.913E1), 1.901E1, (-6.86E1), 2.408E1);
        ctx.bezierCurveTo((-6.3886E1), 2.635E1, (-6.08E1), 1.979E1, (-5.885E1), 1.394E1);
        ctx.bezierCurveTo((-5.885E1), 1.394E1, (-6.197E1), (-6.73E0), (-5.963E1), (-1.102E1));
        ctx.bezierCurveTo((-5.963E1), (-1.102E1), (-4.91E1), (-2.077E1), (-4.949E1), (-2.428E1));
        ctx.bezierCurveTo((-4.949E1), (-2.428E1), (-4.988E1), (-4.183E1), (-5.105E1), (-4.261E1));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#f2b892';
        ctx.fillStyle = 'rgba(242,184,146,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#f2b892';
        ctx.fillStyle = 'rgba(242,184,146,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-5.15E1), (-4.162E1));
        ctx.bezierCurveTo((-5.248E1), (-4.254E1), (-5.986E1), (-4.808E1), (-6.556E1), (-4.2E1));
        ctx.bezierCurveTo((-6.556E1), (-4.2E1), (-7.544E1), (-2.49E1), (-7.468E1), (-1.882E1));
        ctx.lineTo((-7.468E1), (-1.692E1));
        ctx.bezierCurveTo((-7.468E1), (-1.692E1), (-8.19E1), (-1.73E1), (-8.342E1), (-1.54E1));
        ctx.bezierCurveTo((-8.342E1), (-1.54E1), (-8.456E1), (-1.046E1), (-8.57E1), (-1.008E1));
        ctx.bezierCurveTo((-8.57E1), (-1.008E1), (-8.836E1), (-7.8E0), (-8.646E1), (-5.14E0));
        ctx.bezierCurveTo((-8.646E1), (-5.14E0), (-8.836E1), (-2.86E0), (-8.798E1), 9.4E-1);
        ctx.lineTo((-8.076E1), 4.74E0);
        ctx.bezierCurveTo((-8.076E1), 4.74E0, (-7.886E1), 1.842E1, (-6.86E1), 2.336E1);
        ctx.bezierCurveTo((-6.4006E1), 2.5572E1, (-6.1E1), 1.918E1, (-5.91E1), 1.348E1);
        ctx.bezierCurveTo((-5.91E1), 1.348E1, (-6.214E1), (-6.66E0), (-5.986E1), (-1.084E1));
        ctx.bezierCurveTo((-5.986E1), (-1.084E1), (-4.96E1), (-2.034E1), (-4.998E1), (-2.376E1));
        ctx.bezierCurveTo((-4.998E1), (-2.376E1), (-5.036E1), (-4.086E1), (-5.15E1), (-4.162E1));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#f8dcc8';
        ctx.fillStyle = 'rgba(248,220,200,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#f8dcc8';
        ctx.fillStyle = 'rgba(248,220,200,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-5.195E1), (-4.063E1));
        ctx.bezierCurveTo((-5.282E1), (-4.161E1), (-6.009E1), (-4.692E1), (-6.564E1), (-4.1E1));
        ctx.bezierCurveTo((-6.564E1), (-4.1E1), (-7.526E1), (-2.435E1), (-7.452E1), (-1.843E1));
        ctx.lineTo((-7.452E1), (-1.658E1));
        ctx.bezierCurveTo((-7.452E1), (-1.658E1), (-8.155E1), (-1.695E1), (-8.303E1), (-1.51E1));
        ctx.bezierCurveTo((-8.303E1), (-1.51E1), (-8.414E1), (-1.029E1), (-8.525E1), (-9.92E0));
        ctx.bezierCurveTo((-8.525E1), (-9.92E0), (-8.784E1), (-7.7E0), (-8.599E1), (-5.11E0));
        ctx.bezierCurveTo((-8.599E1), (-5.11E0), (-8.784E1), (-2.89E0), (-8.747E1), 8.1E-1);
        ctx.lineTo((-8.044E1), 4.51E0);
        ctx.bezierCurveTo((-8.044E1), 4.51E0, (-7.859E1), 1.783E1, (-6.86E1), 2.264E1);
        ctx.bezierCurveTo((-6.4127E1), 2.4794E1, (-6.12E1), 1.857E1, (-5.935E1), 1.302E1);
        ctx.bezierCurveTo((-5.935E1), 1.302E1, (-6.231E1), (-6.59E0), (-6.009E1), (-1.066E1));
        ctx.bezierCurveTo((-6.009E1), (-1.066E1), (-5.01E1), (-1.991E1), (-5.047E1), (-2.324E1));
        ctx.bezierCurveTo((-5.047E1), (-2.324E1), (-5.084E1), (-3.989E1), (-5.195E1), (-4.063E1));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-5.96E1), 1.246E1);
        ctx.bezierCurveTo((-5.96E1), 1.246E1, (-6.248E1), (-6.52E0), (-6.032E1), (-1.048E1));
        ctx.bezierCurveTo((-6.032E1), (-1.048E1), (-5.06E1), (-1.948E1), (-5.096E1), (-2.272E1));
        ctx.bezierCurveTo((-5.096E1), (-2.272E1), (-5.132E1), (-3.892E1), (-5.24E1), (-3.964E1));
        ctx.bezierCurveTo((-5.316E1), (-4.068E1), (-6.032E1), (-4.576E1), (-6.572E1), (-4E1));
        ctx.bezierCurveTo((-6.572E1), (-4E1), (-7.508E1), (-2.38E1), (-7.436E1), (-1.804E1));
        ctx.lineTo((-7.436E1), (-1.624E1));
        ctx.bezierCurveTo((-7.436E1), (-1.624E1), (-8.12E1), (-1.66E1), (-8.264E1), (-1.48E1));
        ctx.bezierCurveTo((-8.264E1), (-1.48E1), (-8.372E1), (-1.012E1), (-8.48E1), (-9.76E0));
        ctx.bezierCurveTo((-8.48E1), (-9.76E0), (-8.732E1), (-7.6E0), (-8.552E1), (-5.08E0));
        ctx.bezierCurveTo((-8.552E1), (-5.08E0), (-8.732E1), (-2.92E0), (-8.696E1), 6.8E-1);
        ctx.lineTo((-8.012E1), 4.28E0);
        ctx.bezierCurveTo((-8.012E1), 4.28E0, (-7.832E1), 1.724E1, (-6.86E1), 2.192E1);
        ctx.bezierCurveTo((-6.4248E1), 2.4015E1, (-6.14E1), 1.786E1, (-5.96E1), 1.246E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-6.27E1), 6.2E0);
        ctx.bezierCurveTo((-6.27E1), 6.2E0, (-8.43E1), (-4E0), (-8.52E1), (-4.8E0));
        ctx.bezierCurveTo((-8.52E1), (-4.8E0), (-7.61E1), 3.4E0, (-7.53E1), 3.4E0);
        ctx.bezierCurveTo((-7.45E1), 3.4E0, (-6.27E1), 6.2E0, (-6.27E1), 6.2E0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-7.98E1), 0E0);
        ctx.bezierCurveTo((-7.98E1), 0E0, (-6.14E1), 3.6E0, (-6.14E1), 8E0);
        ctx.bezierCurveTo((-6.14E1), 1.0912E1, (-6.1643E1), 2.4331E1, (-6.7E1), 2.28E1);
        ctx.bezierCurveTo((-7.54E1), 2.04E1, (-7.18E1), 6E0, (-7.98E1), 0E0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#99cc32';
        ctx.fillStyle = 'rgba(153,204,50,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#99cc32';
        ctx.fillStyle = 'rgba(153,204,50,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-7.14E1), 3.8E0);
        ctx.bezierCurveTo((-7.14E1), 3.8E0, (-6.2422E1), 5.274E0, (-6.14E1), 8E0);
        ctx.bezierCurveTo((-6.08E1), 9.6E0, (-6.0137E1), 1.7908E1, (-6.56E1), 1.9E1);
        ctx.bezierCurveTo((-7.0152E1), 1.9911E1, (-7.2382E1), 9.69E0, (-7.14E1), 3.8E0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(1.4595E1, 4.6349E1);
        ctx.bezierCurveTo(1.4098E1, 4.4607E1, 1.5409E1, 4.4738E1, 1.72E1, 4.42E1);
        ctx.bezierCurveTo(1.92E1, 4.36E1, 3.14E1, 3.98E1, 3.22E1, 3.72E1);
        ctx.bezierCurveTo(3.3E1, 3.46E1, 4.62E1, 3.9E1, 4.62E1, 3.9E1);
        ctx.bezierCurveTo(4.8E1, 3.98E1, 5.24E1, 4.24E1, 5.24E1, 4.24E1);
        ctx.bezierCurveTo(5.72E1, 4.36E1, 6.38E1, 4.4E1, 6.38E1, 4.4E1);
        ctx.bezierCurveTo(6.62E1, 4.5E1, 6.96E1, 4.78E1, 6.96E1, 4.78E1);
        ctx.bezierCurveTo(8.42E1, 5.8E1, 9.6601E1, 5.08E1, 9.6601E1, 5.08E1);
        ctx.bezierCurveTo(1.16601E2, 4.42E1, 1.10601E2, 2.7E1, 1.10601E2, 2.7E1);
        ctx.bezierCurveTo(1.07601E2, 1.8E1, 1.10801E2, 1.46E1, 1.10801E2, 1.46E1);
        ctx.bezierCurveTo(1.11001E2, 1.08E1, 1.18201E2, 1.72E1, 1.18201E2, 1.72E1);
        ctx.bezierCurveTo(1.20801E2, 2.14E1, 1.21601E2, 2.64E1, 1.21601E2, 2.64E1);
        ctx.bezierCurveTo(1.29601E2, 3.76E1, 1.26201E2, 1.98E1, 1.26201E2, 1.98E1);
        ctx.bezierCurveTo(1.26401E2, 1.88E1, 1.23601E2, 1.52E1, 1.23601E2, 1.4E1);
        ctx.bezierCurveTo(1.23601E2, 1.28E1, 1.21801E2, 9.4E0, 1.21801E2, 9.4E0);
        ctx.bezierCurveTo(1.18801E2, 6E0, 1.21201E2, (-1E0), 1.21201E2, (-1E0));
        ctx.bezierCurveTo(1.23001E2, (-1.48E1), 1.20801E2, (-1.3E1), 1.20801E2, (-1.3E1));
        ctx.bezierCurveTo(1.19601E2, (-1.48E1), 1.10401E2, (-4.8E0), 1.10401E2, (-4.8E0));
        ctx.bezierCurveTo(1.08201E2, (-1.4E0), 1.02201E2, 2E-1, 1.02201E2, 2E-1);
        ctx.bezierCurveTo(9.9401E1, 2E0, 9.6001E1, 6E-1, 9.6001E1, 6E-1);
        ctx.bezierCurveTo(9.3401E1, 2E-1, 8.7801E1, 7.2E0, 8.7801E1, 7.2E0);
        ctx.bezierCurveTo(9.0601E1, 7E0, 9.3001E1, 1.14E1, 9.5401E1, 1.16E1);
        ctx.bezierCurveTo(9.7801E1, 1.18E1, 9.9601E1, 9.2E0, 1.01201E2, 8.6E0);
        ctx.bezierCurveTo(1.02801E2, 8E0, 1.05601E2, 1.38E1, 1.05601E2, 1.38E1);
        ctx.bezierCurveTo(1.06001E2, 1.64E1, 1.00401E2, 2.12E1, 1.00401E2, 2.12E1);
        ctx.bezierCurveTo(1.00001E2, 2.58E1, 9.8401E1, 2.42E1, 9.8401E1, 2.42E1);
        ctx.bezierCurveTo(9.5401E1, 2.36E1, 9.4201E1, 2.74E1, 9.3201E1, 3.2E1);
        ctx.bezierCurveTo(9.2201E1, 3.66E1, 8.8001E1, 3.7E1, 8.8001E1, 3.7E1);
        ctx.bezierCurveTo(8.6401E1, 4.44E1, 8.52E1, 4.14E1, 8.52E1, 4.14E1);
        ctx.bezierCurveTo(8.5E1, 3.58E1, 7.9E1, 4.16E1, 7.9E1, 4.16E1);
        ctx.bezierCurveTo(7.78E1, 4.36E1, 7.32E1, 4.14E1, 7.32E1, 4.14E1);
        ctx.bezierCurveTo(6.64E1, 3.94E1, 6.88E1, 3.74E1, 6.88E1, 3.74E1);
        ctx.bezierCurveTo(7.06E1, 3.52E1, 8.18E1, 3.74E1, 8.18E1, 3.74E1);
        ctx.bezierCurveTo(8.4E1, 3.58E1, 7.6E1, 3.18E1, 7.6E1, 3.18E1);
        ctx.bezierCurveTo(7.54E1, 3E1, 7.64E1, 2.56E1, 7.64E1, 2.56E1);
        ctx.bezierCurveTo(7.76E1, 2.24E1, 8.44E1, 1.68E1, 8.44E1, 1.68E1);
        ctx.bezierCurveTo(9.3801E1, 1.56E1, 9.1001E1, 1.4E1, 9.1001E1, 1.4E1);
        ctx.bezierCurveTo(8.4801E1, 8.8E0, 7.9E1, 1.64E1, 7.9E1, 1.64E1);
        ctx.bezierCurveTo(7.68E1, 2.26E1, 5.94E1, 3.76E1, 5.94E1, 3.76E1);
        ctx.bezierCurveTo(5.46E1, 4.1E1, 5.72E1, 3.42E1, 5.32E1, 3.76E1);
        ctx.bezierCurveTo(4.92E1, 4.1E1, 2.86E1, 3.2E1, 2.86E1, 3.2E1);
        ctx.bezierCurveTo(1.7038E1, 3.0807E1, 1.4306E1, 4.6549E1, 1.0777E1, 4.3429E1);
        ctx.bezierCurveTo(1.0777E1, 4.3429E1, 1.6195E1, 5.1949E1, 1.4595E1, 4.6349E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(2.09401E2, (-1.2E2));
        ctx.bezierCurveTo(2.09401E2, (-1.2E2), 1.83801E2, (-1.12E2), 1.81001E2, (-9.32E1));
        ctx.bezierCurveTo(1.81001E2, (-9.32E1), 1.78601E2, (-7.04E1), 1.99001E2, (-5.28E1));
        ctx.bezierCurveTo(1.99001E2, (-5.28E1), 1.99401E2, (-4.64E1), 2.01401E2, (-4.32E1));
        ctx.bezierCurveTo(2.01401E2, (-4.32E1), 1.99801E2, (-3.84E1), 2.18601E2, (-4.6E1));
        ctx.lineTo(2.45801E2, (-5.44E1));
        ctx.bezierCurveTo(2.45801E2, (-5.44E1), 2.52201E2, (-5.68E1), 2.57401E2, (-6.56E1));
        ctx.bezierCurveTo(2.62601E2, (-7.44E1), 2.77801E2, (-9.32E1), 2.74201E2, (-1.184E2));
        ctx.bezierCurveTo(2.74201E2, (-1.184E2), 2.75401E2, (-1.296E2), 2.69401E2, (-1.3E2));
        ctx.bezierCurveTo(2.69401E2, (-1.3E2), 2.61001E2, (-1.316E2), 2.53801E2, (-1.24E2));
        ctx.bezierCurveTo(2.53801E2, (-1.24E2), 2.47001E2, (-1.208E2), 2.44601E2, (-1.212E2));
        ctx.lineTo(2.09401E2, (-1.2E2));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(2.64022E2, (-1.2099E2));
        ctx.bezierCurveTo(2.64022E2, (-1.2099E2), 2.66122E2, (-1.2992E2), 2.61282E2, (-1.2508E2));
        ctx.bezierCurveTo(2.61282E2, (-1.2508E2), 2.54242E2, (-1.1936E2), 2.46761E2, (-1.1936E2));
        ctx.bezierCurveTo(2.46761E2, (-1.1936E2), 2.32241E2, (-1.1716E2), 2.27841E2, (-1.0396E2));
        ctx.bezierCurveTo(2.27841E2, (-1.0396E2), 2.23881E2, (-7.712E1), 2.31801E2, (-7.14E1));
        ctx.bezierCurveTo(2.31801E2, (-7.14E1), 2.36641E2, (-6.392E1), 2.43681E2, (-7.052E1));
        ctx.bezierCurveTo(2.50722E2, (-7.712E1), 2.66222E2, (-1.0735E2), 2.64022E2, (-1.2099E2));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#323232';
        ctx.fillStyle = 'rgba(50,50,50,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#323232';
        ctx.fillStyle = 'rgba(50,50,50,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(2.63648E2, (-1.20632E2));
        ctx.bezierCurveTo(2.63648E2, (-1.20632E2), 2.65738E2, (-1.29376E2), 2.60986E2, (-1.24624E2));
        ctx.bezierCurveTo(2.60986E2, (-1.24624E2), 2.54074E2, (-1.19008E2), 2.46729E2, (-1.19008E2));
        ctx.bezierCurveTo(2.46729E2, (-1.19008E2), 2.32473E2, (-1.16848E2), 2.28153E2, (-1.03888E2));
        ctx.bezierCurveTo(2.28153E2, (-1.03888E2), 2.24265E2, (-7.7536E1), 2.32041E2, (-7.192E1));
        ctx.bezierCurveTo(2.32041E2, (-7.192E1), 2.36793E2, (-6.4576E1), 2.43705E2, (-7.1056E1));
        ctx.bezierCurveTo(2.50618E2, (-7.7536E1), 2.65808E2, (-1.0724E2), 2.63648E2, (-1.20632E2));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#666666';
        ctx.fillStyle = 'rgba(102,102,102,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#666666';
        ctx.fillStyle = 'rgba(102,102,102,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(2.63274E2, (-1.20274E2));
        ctx.bezierCurveTo(2.63274E2, (-1.20274E2), 2.65354E2, (-1.28832E2), 2.6069E2, (-1.24168E2));
        ctx.bezierCurveTo(2.6069E2, (-1.24168E2), 2.53906E2, (-1.18656E2), 2.46697E2, (-1.18656E2));
        ctx.bezierCurveTo(2.46697E2, (-1.18656E2), 2.32705E2, (-1.16536E2), 2.28465E2, (-1.03816E2));
        ctx.bezierCurveTo(2.28465E2, (-1.03816E2), 2.24649E2, (-7.7952E1), 2.32281E2, (-7.244E1));
        ctx.bezierCurveTo(2.32281E2, (-7.244E1), 2.36945E2, (-6.5232E1), 2.43729E2, (-7.1592E1));
        ctx.bezierCurveTo(2.50514E2, (-7.7952E1), 2.65394E2, (-1.0713E2), 2.63274E2, (-1.20274E2));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#999999';
        ctx.fillStyle = 'rgba(153,153,153,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#999999';
        ctx.fillStyle = 'rgba(153,153,153,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(2.629E2, (-1.19916E2));
        ctx.bezierCurveTo(2.629E2, (-1.19916E2), 2.6497E2, (-1.28288E2), 2.60394E2, (-1.23712E2));
        ctx.bezierCurveTo(2.60394E2, (-1.23712E2), 2.53738E2, (-1.18304E2), 2.46665E2, (-1.18304E2));
        ctx.bezierCurveTo(2.46665E2, (-1.18304E2), 2.32937E2, (-1.16224E2), 2.28777E2, (-1.03744E2));
        ctx.bezierCurveTo(2.28777E2, (-1.03744E2), 2.25033E2, (-7.8368E1), 2.32521E2, (-7.296E1));
        ctx.bezierCurveTo(2.32521E2, (-7.296E1), 2.37097E2, (-6.5888E1), 2.43753E2, (-7.2128E1));
        ctx.bezierCurveTo(2.5041E2, (-7.8368E1), 2.6498E2, (-1.0702E2), 2.629E2, (-1.19916E2));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(2.62526E2, (-1.19558E2));
        ctx.bezierCurveTo(2.62526E2, (-1.19558E2), 2.64586E2, (-1.27744E2), 2.60098E2, (-1.23256E2));
        ctx.bezierCurveTo(2.60098E2, (-1.23256E2), 2.53569E2, (-1.17952E2), 2.46633E2, (-1.17952E2));
        ctx.bezierCurveTo(2.46633E2, (-1.17952E2), 2.33169E2, (-1.15912E2), 2.29089E2, (-1.03672E2));
        ctx.bezierCurveTo(2.29089E2, (-1.03672E2), 2.25417E2, (-7.8784E1), 2.32761E2, (-7.348E1));
        ctx.bezierCurveTo(2.32761E2, (-7.348E1), 2.37249E2, (-6.6544E1), 2.43777E2, (-7.2664E1));
        ctx.bezierCurveTo(2.50305E2, (-7.8784E1), 2.64566E2, (-1.0691E2), 2.62526E2, (-1.19558E2));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(2.62151E2, (-1.192E2));
        ctx.bezierCurveTo(2.62151E2, (-1.192E2), 2.64201E2, (-1.272E2), 2.59801E2, (-1.228E2));
        ctx.bezierCurveTo(2.59801E2, (-1.228E2), 2.53401E2, (-1.176E2), 2.46601E2, (-1.176E2));
        ctx.bezierCurveTo(2.46601E2, (-1.176E2), 2.33401E2, (-1.156E2), 2.29401E2, (-1.036E2));
        ctx.bezierCurveTo(2.29401E2, (-1.036E2), 2.25801E2, (-7.92E1), 2.33001E2, (-7.4E1));
        ctx.bezierCurveTo(2.33001E2, (-7.4E1), 2.37401E2, (-6.72E1), 2.43801E2, (-7.32E1));
        ctx.bezierCurveTo(2.50201E2, (-7.92E1), 2.64151E2, (-1.068E2), 2.62151E2, (-1.192E2));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#992600';
        ctx.fillStyle = 'rgba(153,38,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#992600';
        ctx.fillStyle = 'rgba(153,38,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(5.06E1, 8.4E1);
        ctx.bezierCurveTo(5.06E1, 8.4E1, 3.02E1, 6.48E1, 2.22E1, 6.4E1);
        ctx.bezierCurveTo(2.22E1, 6.4E1, (-1.22E1), 6E1, (-2.7E1), 7.8E1);
        ctx.bezierCurveTo((-2.7E1), 7.8E1, (-9.4E0), 5.76E1, 1.82E1, 6.32E1);
        ctx.bezierCurveTo(1.82E1, 6.32E1, (-3.4E0), 5.88E1, (-1.58E1), 6.2E1);
        ctx.bezierCurveTo((-1.58E1), 6.2E1, (-3.26E1), 6.2E1, (-4.22E1), 7.6E1);
        ctx.lineTo((-4.5E1), 8.08E1);
        ctx.bezierCurveTo((-4.5E1), 8.08E1, (-4.1E1), 6.6E1, (-2.26E1), 6E1);
        ctx.bezierCurveTo((-2.26E1), 6E1, 2E-1, 5.52E1, 1.1E1, 6E1);
        ctx.bezierCurveTo(1.1E1, 6E1, (-1.06E1), 5.32E1, (-2.06E1), 5.52E1);
        ctx.bezierCurveTo((-2.06E1), 5.52E1, (-5.1E1), 5.28E1, (-6.38E1), 7.92E1);
        ctx.bezierCurveTo((-6.38E1), 7.92E1, (-5.98E1), 6.48E1, (-4.5E1), 5.76E1);
        ctx.bezierCurveTo((-4.5E1), 5.76E1, (-3.14E1), 4.88E1, (-1.1E1), 5.16E1);
        ctx.bezierCurveTo((-1.1E1), 5.16E1, 3.4E0, 5.48E1, 8.6E0, 5.72E1);
        ctx.bezierCurveTo(1.38E1, 5.96E1, 1.26E1, 5.68E1, 4.2E0, 5.2E1);
        ctx.bezierCurveTo(4.2E0, 5.2E1, (-1.4E0), 4.2E1, (-1.54E1), 4.24E1);
        ctx.bezierCurveTo((-1.54E1), 4.24E1, (-5.82E1), 4.6E1, (-6.86E1), 5.8E1);
        ctx.bezierCurveTo((-6.86E1), 5.8E1, (-5.5E1), 4.68E1, (-4.46E1), 4.4E1);
        ctx.bezierCurveTo((-4.46E1), 4.4E1, (-2.22E1), 3.6E1, (-1.38E1), 3.68E1);
        ctx.bezierCurveTo((-1.38E1), 3.68E1, 1.1E1, 3.78E1, 1.86E1, 3.38E1);
        ctx.bezierCurveTo(1.86E1, 3.38E1, 7.4E0, 3.88E1, 1.06E1, 4.2E1);
        ctx.bezierCurveTo(1.38E1, 4.52E1, 2.06E1, 5.28E1, 2.06E1, 5.4E1);
        ctx.bezierCurveTo(2.06E1, 5.52E1, 4.48E1, 7.73E1, 4.84E1, 8.17E1);
        ctx.lineTo(5.06E1, 8.4E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(1.89E2, 2.78E2);
        ctx.bezierCurveTo(1.89E2, 2.78E2, 1.735E2, 2.415E2, 1.61E2, 2.32E2);
        ctx.bezierCurveTo(1.61E2, 2.32E2, 1.87E2, 2.48E2, 1.905E2, 2.66E2);
        ctx.bezierCurveTo(1.905E2, 2.66E2, 1.905E2, 2.76E2, 1.89E2, 2.78E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(2.36E2, 2.855E2);
        ctx.bezierCurveTo(2.36E2, 2.855E2, 2.095E2, 2.305E2, 1.91E2, 2.065E2);
        ctx.bezierCurveTo(1.91E2, 2.065E2, 2.345E2, 2.44E2, 2.395E2, 2.705E2);
        ctx.lineTo(2.4E2, 2.76E2);
        ctx.lineTo(2.37E2, 2.735E2);
        ctx.bezierCurveTo(2.37E2, 2.735E2, 2.365E2, 2.825E2, 2.36E2, 2.855E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(2.925E2, 2.37E2);
        ctx.bezierCurveTo(2.925E2, 2.37E2, 2.3E2, 1.775E2, 2.285E2, 1.75E2);
        ctx.bezierCurveTo(2.285E2, 1.75E2, 2.89E2, 2.41E2, 2.92E2, 2.485E2);
        ctx.bezierCurveTo(2.92E2, 2.485E2, 2.9E2, 2.395E2, 2.925E2, 2.37E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(1.04E2, 2.805E2);
        ctx.bezierCurveTo(1.04E2, 2.805E2, 1.235E2, 2.285E2, 1.425E2, 2.51E2);
        ctx.bezierCurveTo(1.425E2, 2.51E2, 1.575E2, 2.61E2, 1.57E2, 2.64E2);
        ctx.bezierCurveTo(1.57E2, 2.64E2, 1.53E2, 2.575E2, 1.35E2, 2.58E2);
        ctx.bezierCurveTo(1.35E2, 2.58E2, 1.16E2, 2.55E2, 1.04E2, 2.805E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(2.945E2, 1.53E2);
        ctx.bezierCurveTo(2.945E2, 1.53E2, 2.495E2, 1.245E2, 2.42E2, 1.23E2);
        ctx.bezierCurveTo(2.30193E2, 1.20639E2, 2.915E2, 1.52E2, 2.965E2, 1.625E2);
        ctx.bezierCurveTo(2.965E2, 1.625E2, 2.985E2, 1.6E2, 2.945E2, 1.53E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(1.43801E2, 2.59601E2);
        ctx.bezierCurveTo(1.43801E2, 2.59601E2, 1.64201E2, 2.57601E2, 1.71001E2, 2.50801E2);
        ctx.lineTo(1.75401E2, 2.54401E2);
        ctx.lineTo(1.93001E2, 2.16001E2);
        ctx.lineTo(1.96601E2, 2.21201E2);
        ctx.bezierCurveTo(1.96601E2, 2.21201E2, 2.11001E2, 2.06401E2, 2.10201E2, 1.98401E2);
        ctx.bezierCurveTo(2.09401E2, 1.90401E2, 2.23001E2, 2.04401E2, 2.23001E2, 2.04401E2);
        ctx.bezierCurveTo(2.23001E2, 2.04401E2, 2.22201E2, 1.92801E2, 2.29401E2, 1.99601E2);
        ctx.bezierCurveTo(2.29401E2, 1.99601E2, 2.27001E2, 1.84001E2, 2.35401E2, 1.92001E2);
        ctx.bezierCurveTo(2.35401E2, 1.92001E2, 2.24864E2, 1.61844E2, 2.47401E2, 1.87601E2);
        ctx.bezierCurveTo(2.53001E2, 1.94001E2, 2.48601E2, 1.87201E2, 2.48601E2, 1.87201E2);
        ctx.bezierCurveTo(2.48601E2, 1.87201E2, 2.22601E2, 1.39201E2, 2.44201E2, 1.53601E2);
        ctx.bezierCurveTo(2.44201E2, 1.53601E2, 2.46201E2, 1.30801E2, 2.45001E2, 1.26401E2);
        ctx.bezierCurveTo(2.43801E2, 1.22001E2, 2.41801E2, 9.96E1, 2.37001E2, 9.44E1);
        ctx.bezierCurveTo(2.32201E2, 8.92E1, 2.37401E2, 8.76E1, 2.43001E2, 9.28E1);
        ctx.bezierCurveTo(2.43001E2, 9.28E1, 2.31801E2, 6.88E1, 2.45001E2, 8.08E1);
        ctx.bezierCurveTo(2.45001E2, 8.08E1, 2.41401E2, 6.56E1, 2.37001E2, 6.28E1);
        ctx.bezierCurveTo(2.37001E2, 6.28E1, 2.31401E2, 4.56E1, 2.46601E2, 5.64E1);
        ctx.bezierCurveTo(2.46601E2, 5.64E1, 2.42201E2, 4.4E1, 2.39001E2, 4.08E1);
        ctx.bezierCurveTo(2.39001E2, 4.08E1, 2.27401E2, 1.32E1, 2.34601E2, 1.8E1);
        ctx.lineTo(2.39001E2, 2.16E1);
        ctx.bezierCurveTo(2.39001E2, 2.16E1, 2.32201E2, 7.6E0, 2.38601E2, 1.2E1);
        ctx.bezierCurveTo(2.45001E2, 1.64E1, 2.45001E2, 1.6E1, 2.45001E2, 1.6E1);
        ctx.bezierCurveTo(2.45001E2, 1.6E1, 2.23801E2, (-1.72E1), 2.44201E2, 4E-1);
        ctx.bezierCurveTo(2.44201E2, 4E-1, 2.36042E2, (-1.3518E1), 2.32601E2, (-2.04E1));
        ctx.bezierCurveTo(2.32601E2, (-2.04E1), 2.13801E2, (-4.08E1), 2.28201E2, (-3.44E1));
        ctx.lineTo(2.33001E2, (-3.28E1));
        ctx.bezierCurveTo(2.33001E2, (-3.28E1), 2.24201E2, (-4.28E1), 2.16201E2, (-4.44E1));
        ctx.bezierCurveTo(2.08201E2, (-4.6E1), 2.18601E2, (-5.24E1), 2.25001E2, (-5.04E1));
        ctx.bezierCurveTo(2.31401E2, (-4.84E1), 2.47001E2, (-4.08E1), 2.47001E2, (-4.08E1));
        ctx.bezierCurveTo(2.47001E2, (-4.08E1), 2.59801E2, (-2.2E1), 2.63801E2, (-2.16E1));
        ctx.bezierCurveTo(2.63801E2, (-2.16E1), 2.43801E2, (-2.92E1), 2.49801E2, (-2.12E1));
        ctx.bezierCurveTo(2.49801E2, (-2.12E1), 2.64201E2, (-7.2E0), 2.57001E2, (-7.6E0));
        ctx.bezierCurveTo(2.57001E2, (-7.6E0), 2.51001E2, (-4E-1), 2.55801E2, 8.4E0);
        ctx.bezierCurveTo(2.55801E2, 8.4E0, 2.37342E2, (-9.991E0), 2.52201E2, 1.56E1);
        ctx.lineTo(2.59001E2, 3.2E1);
        ctx.bezierCurveTo(2.59001E2, 3.2E1, 2.34601E2, 7.2E0, 2.45801E2, 2.92E1);
        ctx.bezierCurveTo(2.45801E2, 2.92E1, 2.63001E2, 5.28E1, 2.65001E2, 5.32E1);
        ctx.bezierCurveTo(2.67001E2, 5.36E1, 2.71401E2, 6.24E1, 2.71401E2, 6.24E1);
        ctx.lineTo(2.67001E2, 6.04E1);
        ctx.lineTo(2.72201E2, 6.92E1);
        ctx.bezierCurveTo(2.72201E2, 6.92E1, 2.61001E2, 5.72E1, 2.67001E2, 7.04E1);
        ctx.lineTo(2.72601E2, 8.48E1);
        ctx.bezierCurveTo(2.72601E2, 8.48E1, 2.52201E2, 6.28E1, 2.65801E2, 9.24E1);
        ctx.bezierCurveTo(2.65801E2, 9.24E1, 2.49401E2, 8.72E1, 2.58201E2, 1.044E2);
        ctx.bezierCurveTo(2.58201E2, 1.044E2, 2.56601E2, 1.20401E2, 2.57001E2, 1.25601E2);
        ctx.bezierCurveTo(2.57401E2, 1.30801E2, 2.58601E2, 1.59201E2, 2.54201E2, 1.67201E2);
        ctx.bezierCurveTo(2.49801E2, 1.75201E2, 2.60201E2, 1.94401E2, 2.62201E2, 1.98401E2);
        ctx.bezierCurveTo(2.64201E2, 2.02401E2, 2.67801E2, 2.13201E2, 2.59001E2, 2.04001E2);
        ctx.bezierCurveTo(2.50201E2, 1.94801E2, 2.54601E2, 2.00401E2, 2.56601E2, 2.09201E2);
        ctx.bezierCurveTo(2.58601E2, 2.18001E2, 2.64601E2, 2.33601E2, 2.63801E2, 2.39201E2);
        ctx.bezierCurveTo(2.63801E2, 2.39201E2, 2.62601E2, 2.40401E2, 2.59401E2, 2.36801E2);
        ctx.bezierCurveTo(2.59401E2, 2.36801E2, 2.44601E2, 2.14001E2, 2.46201E2, 2.28401E2);
        ctx.bezierCurveTo(2.46201E2, 2.28401E2, 2.45001E2, 2.36401E2, 2.41801E2, 2.45201E2);
        ctx.bezierCurveTo(2.41801E2, 2.45201E2, 2.38601E2, 2.56001E2, 2.38601E2, 2.47201E2);
        ctx.bezierCurveTo(2.38601E2, 2.47201E2, 2.35401E2, 2.30401E2, 2.32601E2, 2.38001E2);
        ctx.bezierCurveTo(2.29801E2, 2.45601E2, 2.26201E2, 2.51601E2, 2.23401E2, 2.54001E2);
        ctx.bezierCurveTo(2.20601E2, 2.56401E2, 2.15401E2, 2.33601E2, 2.14201E2, 2.44001E2);
        ctx.bezierCurveTo(2.14201E2, 2.44001E2, 2.02201E2, 2.31601E2, 1.97401E2, 2.48001E2);
        ctx.lineTo(1.85801E2, 2.64401E2);
        ctx.bezierCurveTo(1.85801E2, 2.64401E2, 1.85401E2, 2.52001E2, 1.84201E2, 2.58001E2);
        ctx.bezierCurveTo(1.84201E2, 2.58001E2, 1.54201E2, 2.64001E2, 1.43801E2, 2.59601E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(1.09401E2, (-9.72E1));
        ctx.bezierCurveTo(1.09401E2, (-9.72E1), 9.7801E1, (-1.052E2), 9.3801E1, (-1.048E2));
        ctx.bezierCurveTo(8.9801E1, (-1.044E2), 1.21401E2, (-1.136E2), 1.62601E2, (-8.6E1));
        ctx.bezierCurveTo(1.62601E2, (-8.6E1), 1.67401E2, (-8.32E1), 1.71001E2, (-8.36E1));
        ctx.bezierCurveTo(1.71001E2, (-8.36E1), 1.74201E2, (-8.12E1), 1.71401E2, (-7.76E1));
        ctx.bezierCurveTo(1.71401E2, (-7.76E1), 1.62601E2, (-6.8E1), 1.73801E2, (-5.68E1));
        ctx.bezierCurveTo(1.73801E2, (-5.68E1), 1.92201E2, (-5E1), 1.86601E2, (-5.88E1));
        ctx.bezierCurveTo(1.86601E2, (-5.88E1), 1.97401E2, (-5.48E1), 1.99801E2, (-5.08E1));
        ctx.bezierCurveTo(2.02201E2, (-4.68E1), 2.01001E2, (-5.08E1), 2.01001E2, (-5.08E1));
        ctx.bezierCurveTo(2.01001E2, (-5.08E1), 1.94601E2, (-5.8E1), 1.88601E2, (-6.32E1));
        ctx.bezierCurveTo(1.88601E2, (-6.32E1), 1.83401E2, (-6.52E1), 1.80601E2, (-7.36E1));
        ctx.bezierCurveTo(1.77801E2, (-8.2E1), 1.75401E2, (-9.2E1), 1.79801E2, (-9.52E1));
        ctx.bezierCurveTo(1.79801E2, (-9.52E1), 1.75801E2, (-9.08E1), 1.76601E2, (-9.48E1));
        ctx.bezierCurveTo(1.77401E2, (-9.88E1), 1.81001E2, (-1.024E2), 1.82601E2, (-1.028E2));
        ctx.bezierCurveTo(1.84201E2, (-1.032E2), 2.00601E2, (-1.19E2), 2.07401E2, (-1.194E2));
        ctx.bezierCurveTo(2.07401E2, (-1.194E2), 1.98201E2, (-1.18E2), 1.95201E2, (-1.19E2));
        ctx.bezierCurveTo(1.92201E2, (-1.2E2), 1.65601E2, (-1.314E2), 1.59601E2, (-1.326E2));
        ctx.bezierCurveTo(1.59601E2, (-1.326E2), 1.42801E2, (-1.392E2), 1.54801E2, (-1.372E2));
        ctx.bezierCurveTo(1.54801E2, (-1.372E2), 1.90601E2, (-1.334E2), 2.08801E2, (-1.202E2));
        ctx.bezierCurveTo(2.08801E2, (-1.202E2), 2.01601E2, (-1.286E2), 1.83201E2, (-1.356E2));
        ctx.bezierCurveTo(1.83201E2, (-1.356E2), 1.61001E2, (-1.482E2), 1.25801E2, (-1.432E2));
        ctx.bezierCurveTo(1.25801E2, (-1.432E2), 1.08001E2, (-1.4E2), 1.00201E2, (-1.382E2));
        ctx.bezierCurveTo(1.00201E2, (-1.382E2), 9.7601E1, (-1.388E2), 9.7001E1, (-1.392E2));
        ctx.bezierCurveTo(9.6401E1, (-1.396E2), 8.46E1, (-1.486E2), 5.7E1, (-1.416E2));
        ctx.bezierCurveTo(5.7E1, (-1.416E2), 4E1, (-1.37E2), 3.14E1, (-1.322E2));
        ctx.bezierCurveTo(3.14E1, (-1.322E2), 1.62E1, (-1.31E2), 1.26E1, (-1.278E2));
        ctx.bezierCurveTo(1.26E1, (-1.278E2), (-6E0), (-1.132E2), (-8E0), (-1.124E2));
        ctx.bezierCurveTo((-1E1), (-1.116E2), (-2.14E1), (-1.04E2), (-2.22E1), (-1.036E2));
        ctx.bezierCurveTo((-2.22E1), (-1.036E2), 2.4E0, (-1.102E2), 4.8E0, (-1.126E2));
        ctx.bezierCurveTo(7.2E0, (-1.15E2), 2.46E1, (-1.176E2), 2.7E1, (-1.162E2));
        ctx.bezierCurveTo(2.94E1, (-1.148E2), 3.78E1, (-1.154E2), 2.82E1, (-1.148E2));
        ctx.bezierCurveTo(2.82E1, (-1.148E2), 1.03801E2, (-1E2), 1.04601E2, (-9.8E1));
        ctx.bezierCurveTo(1.05401E2, (-9.6E1), 1.09401E2, (-9.72E1), 1.09401E2, (-9.72E1));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cc7226';
        ctx.fillStyle = 'rgba(204,114,38,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cc7226';
        ctx.fillStyle = 'rgba(204,114,38,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(1.80801E2, (-1.064E2));
        ctx.bezierCurveTo(1.80801E2, (-1.064E2), 1.70601E2, (-1.138E2), 1.68601E2, (-1.138E2));
        ctx.bezierCurveTo(1.66601E2, (-1.138E2), 1.54201E2, (-1.24E2), 1.50001E2, (-1.236E2));
        ctx.bezierCurveTo(1.45801E2, (-1.232E2), 1.33601E2, (-1.332E2), 1.06201E2, (-1.25E2));
        ctx.bezierCurveTo(1.06201E2, (-1.25E2), 1.05601E2, (-1.27E2), 1.09201E2, (-1.278E2));
        ctx.bezierCurveTo(1.09201E2, (-1.278E2), 1.15601E2, (-1.3E2), 1.16001E2, (-1.306E2));
        ctx.bezierCurveTo(1.16001E2, (-1.306E2), 1.36201E2, (-1.348E2), 1.43401E2, (-1.312E2));
        ctx.bezierCurveTo(1.43401E2, (-1.312E2), 1.52601E2, (-1.286E2), 1.58801E2, (-1.224E2));
        ctx.bezierCurveTo(1.58801E2, (-1.224E2), 1.70001E2, (-1.192E2), 1.73201E2, (-1.202E2));
        ctx.bezierCurveTo(1.73201E2, (-1.202E2), 1.82001E2, (-1.18E2), 1.82401E2, (-1.162E2));
        ctx.bezierCurveTo(1.82401E2, (-1.162E2), 1.88201E2, (-1.132E2), 1.86401E2, (-1.106E2));
        ctx.bezierCurveTo(1.86401E2, (-1.106E2), 1.86801E2, (-1.09E2), 1.80801E2, (-1.064E2));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cc7226';
        ctx.fillStyle = 'rgba(204,114,38,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cc7226';
        ctx.fillStyle = 'rgba(204,114,38,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(1.6833E2, (-1.08509E2));
        ctx.bezierCurveTo(1.69137E2, (-1.07877E2), 1.70156E2, (-1.07779E2), 1.70761E2, (-1.0697E2));
        ctx.bezierCurveTo(1.70995E2, (-1.06656E2), 1.70706E2, (-1.0633E2), 1.70391E2, (-1.06233E2));
        ctx.bezierCurveTo(1.69348E2, (-1.05916E2), 1.68292E2, (-1.06486E2), 1.6715E2, (-1.05898E2));
        ctx.bezierCurveTo(1.66748E2, (-1.05691E2), 1.66106E2, (-1.05873E2), 1.65553E2, (-1.06022E2));
        ctx.bezierCurveTo(1.63921E2, (-1.06463E2), 1.62092E2, (-1.06488E2), 1.60401E2, (-1.058E2));
        ctx.bezierCurveTo(1.58416E2, (-1.06929E2), 1.56056E2, (-1.06345E2), 1.53975E2, (-1.07346E2));
        ctx.bezierCurveTo(1.53917E2, (-1.07373E2), 1.53695E2, (-1.07027E2), 1.53621E2, (-1.07054E2));
        ctx.bezierCurveTo(1.50575E2, (-1.08199E2), 1.46832E2, (-1.07916E2), 1.44401E2, (-1.102E2));
        ctx.bezierCurveTo(1.41973E2, (-1.10612E2), 1.39616E2, (-1.11074E2), 1.37188E2, (-1.11754E2));
        ctx.bezierCurveTo(1.3537E2, (-1.12263E2), 1.33961E2, (-1.13252E2), 1.32341E2, (-1.14084E2));
        ctx.bezierCurveTo(1.30964E2, (-1.14792E2), 1.29507E2, (-1.15314E2), 1.27973E2, (-1.15686E2));
        ctx.bezierCurveTo(1.2611E2, (-1.16138E2), 1.24279E2, (-1.16026E2), 1.22386E2, (-1.16546E2));
        ctx.bezierCurveTo(1.22293E2, (-1.16571E2), 1.22101E2, (-1.16227E2), 1.22019E2, (-1.16254E2));
        ctx.bezierCurveTo(1.21695E2, (-1.16362E2), 1.21405E2, (-1.16945E2), 1.21234E2, (-1.16892E2));
        ctx.bezierCurveTo(1.19553E2, (-1.1637E2), 1.18065E2, (-1.17342E2), 1.16401E2, (-1.17E2));
        ctx.bezierCurveTo(1.15223E2, (-1.18224E2), 1.13495E2, (-1.17979E2), 1.11949E2, (-1.18421E2));
        ctx.bezierCurveTo(1.08985E2, (-1.19269E2), 1.05831E2, (-1.17999E2), 1.02801E2, (-1.19E2));
        ctx.bezierCurveTo(1.06914E2, (-1.20842E2), 1.11601E2, (-1.1961E2), 1.15663E2, (-1.21679E2));
        ctx.bezierCurveTo(1.17991E2, (-1.22865E2), 1.20653E2, (-1.21763E2), 1.23223E2, (-1.22523E2));
        ctx.bezierCurveTo(1.2371E2, (-1.22667E2), 1.24401E2, (-1.22869E2), 1.24801E2, (-1.222E2));
        ctx.bezierCurveTo(1.24935E2, (-1.22335E2), 1.25117E2, (-1.22574E2), 1.25175E2, (-1.22546E2));
        ctx.bezierCurveTo(1.27625E2, (-1.21389E2), 1.2994E2, (-1.20115E2), 1.32422E2, (-1.19049E2));
        ctx.bezierCurveTo(1.32763E2, (-1.18903E2), 1.33295E2, (-1.19135E2), 1.33547E2, (-1.18933E2));
        ctx.bezierCurveTo(1.35067E2, (-1.17717E2), 1.3701E2, (-1.1782E2), 1.38401E2, (-1.166E2));
        ctx.bezierCurveTo(1.40099E2, (-1.17102E2), 1.41892E2, (-1.16722E2), 1.43621E2, (-1.17346E2));
        ctx.bezierCurveTo(1.43698E2, (-1.17373E2), 1.43932E2, (-1.17032E2), 1.43965E2, (-1.17054E2));
        ctx.bezierCurveTo(1.45095E2, (-1.17802E2), 1.4625E2, (-1.17531E2), 1.47142E2, (-1.17227E2));
        ctx.bezierCurveTo(1.4748E2, (-1.17112E2), 1.48143E2, (-1.16865E2), 1.48448E2, (-1.16791E2));
        ctx.bezierCurveTo(1.49574E2, (-1.16515E2), 1.5043E2, (-1.16035E2), 1.51609E2, (-1.15852E2));
        ctx.bezierCurveTo(1.51723E2, (-1.15834E2), 1.51908E2, (-1.16174E2), 1.5198E2, (-1.16146E2));
        ctx.bezierCurveTo(1.53103E2, (-1.15708E2), 1.54145E2, (-1.15764E2), 1.54801E2, (-1.146E2));
        ctx.bezierCurveTo(1.54936E2, (-1.14735E2), 1.55101E2, (-1.14973E2), 1.55183E2, (-1.14946E2));
        ctx.bezierCurveTo(1.5621E2, (-1.14608E2), 1.56859E2, (-1.13853E2), 1.5796E2, (-1.13612E2));
        ctx.bezierCurveTo(1.58445E2, (-1.13506E2), 1.59057E2, (-1.1288E2), 1.59633E2, (-1.12704E2));
        ctx.bezierCurveTo(1.62025E2, (-1.11973E2), 1.63868E2, (-1.10444E2), 1.66062E2, (-1.09549E2));
        ctx.bezierCurveTo(1.66821E2, (-1.09239E2), 1.67697E2, (-1.09005E2), 1.6833E2, (-1.08509E2));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cc7226';
        ctx.fillStyle = 'rgba(204,114,38,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cc7226';
        ctx.fillStyle = 'rgba(204,114,38,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(9.1696E1, (-1.22739E2));
        ctx.bezierCurveTo(8.9178E1, (-1.24464E2), 8.681E1, (-1.2557E2), 8.4368E1, (-1.27356E2));
        ctx.bezierCurveTo(8.4187E1, (-1.27489E2), 8.3827E1, (-1.27319E2), 8.3625E1, (-1.27441E2));
        ctx.bezierCurveTo(8.2618E1, (-1.2805E2), 8.173E1, (-1.28631E2), 8.0748E1, (-1.29327E2));
        ctx.bezierCurveTo(8.0209E1, (-1.29709E2), 7.9388E1, (-1.29698E2), 7.888E1, (-1.29956E2));
        ctx.bezierCurveTo(7.6336E1, (-1.31248E2), 7.3707E1, (-1.31806E2), 7.12E1, (-1.33E2));
        ctx.bezierCurveTo(7.1882E1, (-1.33638E2), 7.3004E1, (-1.33394E2), 7.36E1, (-1.342E2));
        ctx.bezierCurveTo(7.3795E1, (-1.3392E2), 7.4033E1, (-1.33636E2), 7.4386E1, (-1.33827E2));
        ctx.bezierCurveTo(7.6064E1, (-1.34731E2), 7.7914E1, (-1.34884E2), 7.959E1, (-1.34794E2));
        ctx.bezierCurveTo(8.1294E1, (-1.34702E2), 8.3014E1, (-1.34397E2), 8.4789E1, (-1.34125E2));
        ctx.bezierCurveTo(8.5096E1, (-1.34078E2), 8.5295E1, (-1.33555E2), 8.5618E1, (-1.33458E2));
        ctx.bezierCurveTo(8.7846E1, (-1.32795E2), 9.0235E1, (-1.3332E2), 9.2354E1, (-1.32482E2));
        ctx.bezierCurveTo(9.3945E1, (-1.31853E2), 9.5515E1, (-1.3103E2), 9.6754E1, (-1.29755E2));
        ctx.bezierCurveTo(9.7006E1, (-1.29495E2), 9.6681E1, (-1.29194E2), 9.6401E1, (-1.29E2));
        ctx.bezierCurveTo(9.6789E1, (-1.29109E2), 9.7062E1, (-1.28903E2), 9.7173E1, (-1.2859E2));
        ctx.bezierCurveTo(9.7257E1, (-1.28351E2), 9.7257E1, (-1.28049E2), 9.7173E1, (-1.2781E2));
        ctx.bezierCurveTo(9.7061E1, (-1.27498E2), 9.6782E1, (-1.27397E2), 9.6408E1, (-1.27346E2));
        ctx.bezierCurveTo(9.5001E1, (-1.27156E2), 9.6773E1, (-1.28536E2), 9.6073E1, (-1.28088E2));
        ctx.bezierCurveTo(9.48E1, (-1.27274E2), 9.5546E1, (-1.25868E2), 9.4801E1, (-1.246E2));
        ctx.bezierCurveTo(9.4521E1, (-1.24794E2), 9.4291E1, (-1.25012E2), 9.4401E1, (-1.254E2));
        ctx.bezierCurveTo(9.4635E1, (-1.24878E2), 9.4033E1, (-1.24588E2), 9.3865E1, (-1.24272E2));
        ctx.bezierCurveTo(9.348E1, (-1.23547E2), 9.2581E1, (-1.22132E2), 9.1696E1, (-1.22739E2));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cc7226';
        ctx.fillStyle = 'rgba(204,114,38,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cc7226';
        ctx.fillStyle = 'rgba(204,114,38,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(5.9198E1, (-1.15391E2));
        ctx.bezierCurveTo(5.6044E1, (-1.16185E2), 5.2994E1, (-1.1607E2), 4.9978E1, (-1.17346E2));
        ctx.bezierCurveTo(4.9911E1, (-1.17374E2), 4.9688E1, (-1.17027E2), 4.9624E1, (-1.17054E2));
        ctx.bezierCurveTo(4.8258E1, (-1.17648E2), 4.734E1, (-1.18614E2), 4.6264E1, (-1.1966E2));
        ctx.bezierCurveTo(4.5351E1, (-1.20548E2), 4.3693E1, (-1.20161E2), 4.2419E1, (-1.20648E2));
        ctx.bezierCurveTo(4.2095E1, (-1.20772E2), 4.1892E1, (-1.21284E2), 4.1591E1, (-1.21323E2));
        ctx.bezierCurveTo(4.0372E1, (-1.2148E2), 3.9445E1, (-1.22429E2), 3.84E1, (-1.23E2));
        ctx.bezierCurveTo(4.0736E1, (-1.23795E2), 4.3147E1, (-1.23764E2), 4.5609E1, (-1.24148E2));
        ctx.bezierCurveTo(4.5722E1, (-1.24166E2), 4.5867E1, (-1.23845E2), 4.6E1, (-1.23845E2));
        ctx.bezierCurveTo(4.6136E1, (-1.23845E2), 4.6266E1, (-1.24066E2), 4.64E1, (-1.242E2));
        ctx.bezierCurveTo(4.6595E1, (-1.2392E2), 4.6897E1, (-1.23594E2), 4.7154E1, (-1.23848E2));
        ctx.bezierCurveTo(4.7702E1, (-1.24388E2), 4.8258E1, (-1.24198E2), 4.8798E1, (-1.24158E2));
        ctx.bezierCurveTo(4.8942E1, (-1.24148E2), 4.9067E1, (-1.23845E2), 4.92E1, (-1.23845E2));
        ctx.bezierCurveTo(4.9336E1, (-1.23845E2), 4.9467E1, (-1.24156E2), 4.96E1, (-1.24156E2));
        ctx.bezierCurveTo(4.9736E1, (-1.24155E2), 4.9867E1, (-1.23845E2), 5E1, (-1.23845E2));
        ctx.bezierCurveTo(5.0136E1, (-1.23845E2), 5.0266E1, (-1.24066E2), 5.04E1, (-1.242E2));
        ctx.bezierCurveTo(5.1092E1, (-1.23418E2), 5.1977E1, (-1.23972E2), 5.2799E1, (-1.23793E2));
        ctx.bezierCurveTo(5.3837E1, (-1.23566E2), 5.4104E1, (-1.22418E2), 5.5178E1, (-1.2212E2));
        ctx.bezierCurveTo(5.9893E1, (-1.20816E2), 6.403E1, (-1.18671E2), 6.8393E1, (-1.16584E2));
        ctx.bezierCurveTo(6.87E1, (-1.16437E2), 6.891E1, (-1.16189E2), 6.88E1, (-1.158E2));
        ctx.bezierCurveTo(6.9067E1, (-1.158E2), 6.938E1, (-1.15888E2), 6.957E1, (-1.15756E2));
        ctx.bezierCurveTo(7.0628E1, (-1.15024E2), 7.1669E1, (-1.14476E2), 7.2366E1, (-1.13378E2));
        ctx.bezierCurveTo(7.2582E1, (-1.13039E2), 7.2253E1, (-1.12632E2), 7.202E1, (-1.12684E2));
        ctx.bezierCurveTo(6.7591E1, (-1.13679E2), 6.3585E1, (-1.14287E2), 5.9198E1, (-1.15391E2));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cc7226';
        ctx.fillStyle = 'rgba(204,114,38,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cc7226';
        ctx.fillStyle = 'rgba(204,114,38,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(4.5338E1, (-7.1179E1));
        ctx.bezierCurveTo(4.3746E1, (-7.2398E1), 4.3162E1, (-7.4429E1), 4.2034E1, (-7.6221E1));
        ctx.bezierCurveTo(4.182E1, (-7.6561E1), 4.2094E1, (-7.6875E1), 4.2411E1, (-7.6964E1));
        ctx.bezierCurveTo(4.2971E1, (-7.7123E1), 4.3514E1, (-7.6645E1), 4.3923E1, (-7.6443E1));
        ctx.bezierCurveTo(4.5668E1, (-7.5581E1), 4.7203E1, (-7.4339E1), 4.92E1, (-7.42E1));
        ctx.bezierCurveTo(5.119E1, (-7.1966E1), 5.545E1, (-7.1581E1), 5.5457E1, (-6.82E1));
        ctx.bezierCurveTo(5.5458E1, (-6.7341E1), 5.403E1, (-6.8259E1), 5.36E1, (-6.74E1));
        ctx.bezierCurveTo(5.1149E1, (-6.8403E1), 4.876E1, (-6.83E1), 4.638E1, (-6.9767E1));
        ctx.bezierCurveTo(4.5763E1, (-7.0148E1), 4.6093E1, (-7.0601E1), 4.5338E1, (-7.1179E1));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cc7226';
        ctx.fillStyle = 'rgba(204,114,38,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cc7226';
        ctx.fillStyle = 'rgba(204,114,38,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(1.78E1, (-1.23756E2));
        ctx.bezierCurveTo(1.7935E1, (-1.23755E2), 2.4966E1, (-1.23522E2), 2.4949E1, (-1.23408E2));
        ctx.bezierCurveTo(2.4904E1, (-1.23099E2), 1.7174E1, (-1.2205E2), 1.681E1, (-1.2222E2));
        ctx.bezierCurveTo(1.6646E1, (-1.22296E2), 9.134E0, (-1.19866E2), 9E0, (-1.2E2));
        ctx.bezierCurveTo(9.268E0, (-1.20135E2), 1.7534E1, (-1.23756E2), 1.78E1, (-1.23756E2));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(3.32E1, (-1.14E2));
        ctx.bezierCurveTo(3.32E1, (-1.14E2), 1.84E1, (-1.122E2), 1.4E1, (-1.11E2));
        ctx.bezierCurveTo(9.6E0, (-1.098E2), (-9E0), (-1.022E2), (-1.2E1), (-1.002E2));
        ctx.bezierCurveTo((-1.2E1), (-1.002E2), (-2.54E1), (-9.48E1), (-4.24E1), (-7.48E1));
        ctx.bezierCurveTo((-4.24E1), (-7.48E1), (-3.48E1), (-7.82E1), (-3.26E1), (-8.1E1));
        ctx.bezierCurveTo((-3.26E1), (-8.1E1), (-1.9E1), (-9.36E1), (-1.92E1), (-9.1E1));
        ctx.bezierCurveTo((-1.92E1), (-9.1E1), (-7E0), (-9.96E1), (-7.6E0), (-9.74E1));
        ctx.bezierCurveTo((-7.6E0), (-9.74E1), 1.68E1, (-1.086E2), 1.48E1, (-1.054E2));
        ctx.bezierCurveTo(1.48E1, (-1.054E2), 3.64E1, (-1.1E2), 3.54E1, (-1.08E2));
        ctx.bezierCurveTo(3.54E1, (-1.08E2), 5.42E1, (-1.036E2), 5.14E1, (-1.034E2));
        ctx.bezierCurveTo(5.14E1, (-1.034E2), 4.56E1, (-1.022E2), 5.2E1, (-9.86E1));
        ctx.bezierCurveTo(5.2E1, (-9.86E1), 4.86E1, (-9.42E1), 4.32E1, (-9.82E1));
        ctx.bezierCurveTo(3.78E1, (-1.022E2), 4.08E1, (-1E2), 3.58E1, (-9.9E1));
        ctx.bezierCurveTo(3.58E1, (-9.9E1), 3.32E1, (-9.82E1), 2.86E1, (-1.022E2));
        ctx.bezierCurveTo(2.86E1, (-1.022E2), 2.3E1, (-1.068E2), 1.42E1, (-1.032E2));
        ctx.bezierCurveTo(1.42E1, (-1.032E2), (-1.64E1), (-9.06E1), (-1.84E1), (-9E1));
        ctx.bezierCurveTo((-1.84E1), (-9E1), (-2.2E1), (-8.72E1), (-2.44E1), (-8.36E1));
        ctx.bezierCurveTo((-2.44E1), (-8.36E1), (-3.02E1), (-7.92E1), (-3.32E1), (-7.78E1));
        ctx.bezierCurveTo((-3.32E1), (-7.78E1), (-4.6E1), (-6.62E1), (-4.72E1), (-6.48E1));
        ctx.bezierCurveTo((-4.72E1), (-6.48E1), (-5.06E1), (-5.96E1), (-5.14E1), (-5.92E1));
        ctx.bezierCurveTo((-5.14E1), (-5.92E1), (-4.5E1), (-6.3E1), (-4.3E1), (-6.5E1));
        ctx.bezierCurveTo((-4.3E1), (-6.5E1), (-2.9E1), (-7.5E1), (-2.36E1), (-7.58E1));
        ctx.bezierCurveTo((-2.36E1), (-7.58E1), (-1.92E1), (-7.88E1), (-1.84E1), (-8.02E1));
        ctx.bezierCurveTo((-1.84E1), (-8.02E1), (-4E0), (-8.94E1), 2E-1, (-8.94E1));
        ctx.bezierCurveTo(2E-1, (-8.94E1), 9.4E0, (-8.42E1), 1.18E1, (-9.12E1));
        ctx.bezierCurveTo(1.18E1, (-9.12E1), 1.76E1, (-9.3E1), 2.32E1, (-9.18E1));
        ctx.bezierCurveTo(2.32E1, (-9.18E1), 2.64E1, (-9.44E1), 2.56E1, (-9.66E1));
        ctx.bezierCurveTo(2.56E1, (-9.66E1), 2.72E1, (-9.84E1), 2.82E1, (-9.46E1));
        ctx.bezierCurveTo(2.82E1, (-9.46E1), 3.16E1, (-9.1E1), 3.64E1, (-9.3E1));
        ctx.bezierCurveTo(3.64E1, (-9.3E1), 4.04E1, (-9.32E1), 3.84E1, (-9.08E1));
        ctx.bezierCurveTo(3.84E1, (-9.08E1), 3.4E1, (-8.7E1), 2.22E1, (-8.68E1));
        ctx.bezierCurveTo(2.22E1, (-8.68E1), 9.8E0, (-8.62E1), (-6.6E0), (-7.86E1));
        ctx.bezierCurveTo((-6.6E0), (-7.86E1), (-3.64E1), (-6.82E1), (-4.56E1), (-5.78E1));
        ctx.bezierCurveTo((-4.56E1), (-5.78E1), (-5.2E1), (-4.9E1), (-5.74E1), (-4.78E1));
        ctx.bezierCurveTo((-5.74E1), (-4.78E1), (-6.32E1), (-4.7E1), (-6.92E1), (-3.96E1));
        ctx.bezierCurveTo((-6.92E1), (-3.96E1), (-5.94E1), (-4.54E1), (-5.04E1), (-4.54E1));
        ctx.bezierCurveTo((-5.04E1), (-4.54E1), (-4.64E1), (-4.78E1), (-5.02E1), (-4.42E1));
        ctx.bezierCurveTo((-5.02E1), (-4.42E1), (-5.38E1), (-3.66E1), (-5.22E1), (-3.12E1));
        ctx.bezierCurveTo((-5.22E1), (-3.12E1), (-5.28E1), (-2.6E1), (-5.36E1), (-2.44E1));
        ctx.bezierCurveTo((-5.36E1), (-2.44E1), (-6.14E1), (-1.16E1), (-6.14E1), (-9.2E0));
        ctx.bezierCurveTo((-6.14E1), (-6.8E0), (-6.02E1), 3E0, (-5.98E1), 3.6E0);
        ctx.bezierCurveTo((-5.94E1), 4.2E0, (-6.08E1), 2E0, (-5.7E1), 4.4E0);
        ctx.bezierCurveTo((-5.32E1), 6.8E0, (-5.04E1), 8.4E0, (-4.96E1), 1.12E1);
        ctx.bezierCurveTo((-4.88E1), 1.4E1, (-5.16E1), 5.8E0, (-5.18E1), 4E0);
        ctx.bezierCurveTo((-5.2E1), 2.2E0, (-5.62E1), (-5E0), (-5.54E1), (-7.4E0));
        ctx.bezierCurveTo((-5.54E1), (-7.4E0), (-5.44E1), (-6.4E0), (-5.36E1), (-5E0));
        ctx.bezierCurveTo((-5.36E1), (-5E0), (-5.42E1), (-5.6E0), (-5.36E1), (-9.2E0));
        ctx.bezierCurveTo((-5.36E1), (-9.2E0), (-5.28E1), (-1.44E1), (-5.14E1), (-1.76E1));
        ctx.bezierCurveTo((-5E1), (-2.08E1), (-4.8E1), (-2.46E1), (-4.76E1), (-2.54E1));
        ctx.bezierCurveTo((-4.72E1), (-2.62E1), (-4.72E1), (-3.2E1), (-4.58E1), (-2.94E1));
        ctx.lineTo((-4.24E1), (-2.68E1));
        ctx.bezierCurveTo((-4.24E1), (-2.68E1), (-4.52E1), (-2.94E1), (-4.3E1), (-3.16E1));
        ctx.bezierCurveTo((-4.3E1), (-3.16E1), (-4.4E1), (-3.72E1), (-4.22E1), (-3.98E1));
        ctx.bezierCurveTo((-4.22E1), (-3.98E1), (-3.52E1), (-4.82E1), (-3.36E1), (-4.92E1));
        ctx.bezierCurveTo((-3.2E1), (-5.02E1), (-3.34E1), (-4.98E1), (-3.34E1), (-4.98E1));
        ctx.bezierCurveTo((-3.34E1), (-4.98E1), (-2.74E1), (-5.4E1), (-3.32E1), (-5.24E1));
        ctx.bezierCurveTo((-3.32E1), (-5.24E1), (-3.72E1), (-5.08E1), (-4.02E1), (-5.08E1));
        ctx.bezierCurveTo((-4.02E1), (-5.08E1), (-4.78E1), (-4.88E1), (-4.38E1), (-5.3E1));
        ctx.bezierCurveTo((-3.98E1), (-5.72E1), (-2.98E1), (-6.26E1), (-2.6E1), (-6.24E1));
        ctx.lineTo((-2.52E1), (-6.08E1));
        ctx.lineTo((-1.4E1), (-6.32E1));
        ctx.lineTo((-1.52E1), (-6.24E1));
        ctx.bezierCurveTo((-1.52E1), (-6.24E1), (-1.54E1), (-6.26E1), (-1.12E1), (-6.3E1));
        ctx.bezierCurveTo((-7E0), (-6.34E1), (-1.2E0), (-6.2E1), 2E-1, (-6.38E1));
        ctx.bezierCurveTo(1.6E0, (-6.56E1), 5E0, (-6.66E1), 4.6E0, (-6.52E1));
        ctx.bezierCurveTo(4.2E0, (-6.38E1), 4E0, (-6.18E1), 4E0, (-6.18E1));
        ctx.bezierCurveTo(4E0, (-6.18E1), 9E0, (-6.76E1), 8.4E0, (-6.54E1));
        ctx.bezierCurveTo(7.8E0, (-6.32E1), (-4E-1), (-5.8E1), (-1.8E0), (-5.18E1));
        ctx.lineTo(8.6E0, (-6E1));
        ctx.lineTo(1.22E1, (-6.3E1));
        ctx.bezierCurveTo(1.22E1, (-6.3E1), 1.58E1, (-6.08E1), 1.6E1, (-6.24E1));
        ctx.bezierCurveTo(1.62E1, (-6.4E1), 2.08E1, (-6.98E1), 2.2E1, (-6.96E1));
        ctx.bezierCurveTo(2.32E1, (-6.94E1), 2.52E1, (-7.22E1), 2.5E1, (-6.96E1));
        ctx.bezierCurveTo(2.48E1, (-6.7E1), 3.24E1, (-6.16E1), 3.24E1, (-6.16E1));
        ctx.bezierCurveTo(3.24E1, (-6.16E1), 3.56E1, (-6.34E1), 3.7E1, (-6.2E1));
        ctx.bezierCurveTo(3.84E1, (-6.06E1), 4.26E1, (-8.18E1), 4.26E1, (-8.18E1));
        ctx.lineTo(6.76E1, (-9.24E1));
        ctx.lineTo(1.11201E2, (-9.58E1));
        ctx.lineTo(9.4201E1, (-1.026E2));
        ctx.lineTo(3.32E1, (-1.14E2));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.strokeStyle = '#4c0000';
        ctx.lineWidth = 2E0;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.strokeStyle = '#4c0000';
        ctx.lineWidth = 2E0;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(5.14E1, 8.5E1);
        ctx.bezierCurveTo(5.14E1, 8.5E1, 3.64E1, 6.82E1, 2.8E1, 6.56E1);
        ctx.bezierCurveTo(2.8E1, 6.56E1, 1.46E1, 5.88E1, (-1E1), 6.66E1);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.strokeStyle = '#4c0000';
        ctx.lineWidth = 2E0;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.strokeStyle = '#4c0000';
        ctx.lineWidth = 2E0;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(2.48E1, 6.42E1);
        ctx.bezierCurveTo(2.48E1, 6.42E1, (-4E-1), 5.62E1, (-1.58E1), 6.04E1);
        ctx.bezierCurveTo((-1.58E1), 6.04E1, (-3.42E1), 6.24E1, (-4.26E1), 7.62E1);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.strokeStyle = '#4c0000';
        ctx.lineWidth = 2E0;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.strokeStyle = '#4c0000';
        ctx.lineWidth = 2E0;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(2.12E1, 6.3E1);
        ctx.bezierCurveTo(2.12E1, 6.3E1, 4.2E0, 5.58E1, (-1.06E1), 5.36E1);
        ctx.bezierCurveTo((-1.06E1), 5.36E1, (-2.72E1), 5.1E1, (-4.38E1), 5.82E1);
        ctx.bezierCurveTo((-4.38E1), 5.82E1, (-5.6E1), 6.42E1, (-6.14E1), 7.44E1);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.strokeStyle = '#4c0000';
        ctx.lineWidth = 2E0;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.strokeStyle = '#4c0000';
        ctx.lineWidth = 2E0;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(2.22E1, 6.34E1);
        ctx.bezierCurveTo(2.22E1, 6.34E1, 6.8E0, 5.24E1, 5.8E0, 5.1E1);
        ctx.bezierCurveTo(5.8E0, 5.1E1, (-1.2E0), 4E1, (-1.42E1), 3.96E1);
        ctx.bezierCurveTo((-1.42E1), 3.96E1, (-3.56E1), 4.04E1, (-5.28E1), 4.84E1);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(2.0895E1, 5.4407E1);
        ctx.bezierCurveTo(2.2437E1, 5.587E1, 4.94E1, 8.48E1, 4.94E1, 8.48E1);
        ctx.bezierCurveTo(8.46E1, 1.21401E2, 5.66E1, 8.72E1, 5.66E1, 8.72E1);
        ctx.bezierCurveTo(4.9E1, 8.24E1, 3.98E1, 6.36E1, 3.98E1, 6.36E1);
        ctx.bezierCurveTo(3.86E1, 6.08E1, 5.38E1, 7.08E1, 5.38E1, 7.08E1);
        ctx.bezierCurveTo(5.78E1, 7.16E1, 7.14E1, 9.08E1, 7.14E1, 9.08E1);
        ctx.bezierCurveTo(6.46E1, 8.84E1, 6.94E1, 9.56E1, 6.94E1, 9.56E1);
        ctx.bezierCurveTo(7.22E1, 9.76E1, 9.2601E1, 1.13201E2, 9.2601E1, 1.13201E2);
        ctx.bezierCurveTo(9.6201E1, 1.17201E2, 1.00201E2, 1.18801E2, 1.00201E2, 1.18801E2);
        ctx.bezierCurveTo(1.14201E2, 1.13601E2, 1.07801E2, 1.26801E2, 1.07801E2, 1.26801E2);
        ctx.bezierCurveTo(1.10201E2, 1.33601E2, 1.15801E2, 1.22001E2, 1.15801E2, 1.22001E2);
        ctx.bezierCurveTo(1.27001E2, 1.052E2, 1.10601E2, 1.07601E2, 1.10601E2, 1.07601E2);
        ctx.bezierCurveTo(8.06E1, 1.10401E2, 7.38E1, 9.44E1, 7.38E1, 9.44E1);
        ctx.bezierCurveTo(7.14E1, 9.2E1, 8.02E1, 9.44E1, 8.02E1, 9.44E1);
        ctx.bezierCurveTo(8.8601E1, 9.64E1, 7.3E1, 8.2E1, 7.3E1, 8.2E1);
        ctx.bezierCurveTo(7.54E1, 8.2E1, 8.46E1, 8.88E1, 8.46E1, 8.88E1);
        ctx.bezierCurveTo(9.5001E1, 9.8E1, 9.7001E1, 9.6E1, 9.7001E1, 9.6E1);
        ctx.bezierCurveTo(1.15001E2, 8.72E1, 1.25401E2, 9.48E1, 1.25401E2, 9.48E1);
        ctx.bezierCurveTo(1.27401E2, 9.64E1, 1.21801E2, 1.032E2, 1.23401E2, 1.08401E2);
        ctx.bezierCurveTo(1.25001E2, 1.13601E2, 1.29801E2, 1.26001E2, 1.29801E2, 1.26001E2);
        ctx.bezierCurveTo(1.27401E2, 1.27601E2, 1.27801E2, 1.38401E2, 1.27801E2, 1.38401E2);
        ctx.bezierCurveTo(1.44601E2, 1.61601E2, 1.35001E2, 1.59601E2, 1.35001E2, 1.59601E2);
        ctx.bezierCurveTo(1.19401E2, 1.59201E2, 1.34201E2, 1.66801E2, 1.34201E2, 1.66801E2);
        ctx.bezierCurveTo(1.37401E2, 1.68801E2, 1.46201E2, 1.76001E2, 1.46201E2, 1.76001E2);
        ctx.bezierCurveTo(1.43401E2, 1.74801E2, 1.41801E2, 1.80001E2, 1.41801E2, 1.80001E2);
        ctx.bezierCurveTo(1.46601E2, 1.84001E2, 1.43801E2, 1.88801E2, 1.43801E2, 1.88801E2);
        ctx.bezierCurveTo(1.37801E2, 1.90001E2, 1.36601E2, 1.94001E2, 1.36601E2, 1.94001E2);
        ctx.bezierCurveTo(1.43401E2, 2.02001E2, 1.33401E2, 2.02401E2, 1.33401E2, 2.02401E2);
        ctx.bezierCurveTo(1.37001E2, 2.06801E2, 1.32201E2, 2.18801E2, 1.32201E2, 2.18801E2);
        ctx.bezierCurveTo(1.27401E2, 2.18801E2, 1.21001E2, 2.24401E2, 1.21001E2, 2.24401E2);
        ctx.bezierCurveTo(1.23401E2, 2.29201E2, 1.13001E2, 2.34801E2, 1.13001E2, 2.34801E2);
        ctx.bezierCurveTo(1.04601E2, 2.36401E2, 1.07401E2, 2.43201E2, 1.07401E2, 2.43201E2);
        ctx.bezierCurveTo(9.9401E1, 2.49201E2, 9.7001E1, 2.65201E2, 9.7001E1, 2.65201E2);
        ctx.bezierCurveTo(9.6201E1, 2.75601E2, 9.3801E1, 2.78801E2, 9.9001E1, 2.76801E2);
        ctx.bezierCurveTo(1.04201E2, 2.74801E2, 1.03401E2, 2.62401E2, 1.03401E2, 2.62401E2);
        ctx.bezierCurveTo(9.8601E1, 2.46801E2, 1.41401E2, 2.30801E2, 1.41401E2, 2.30801E2);
        ctx.bezierCurveTo(1.45401E2, 2.29201E2, 1.46201E2, 2.24001E2, 1.46201E2, 2.24001E2);
        ctx.bezierCurveTo(1.48201E2, 2.24401E2, 1.57001E2, 2.32001E2, 1.57001E2, 2.32001E2);
        ctx.bezierCurveTo(1.64601E2, 2.43201E2, 1.65001E2, 2.34001E2, 1.65001E2, 2.34001E2);
        ctx.bezierCurveTo(1.66201E2, 2.30401E2, 1.64601E2, 2.24401E2, 1.64601E2, 2.24401E2);
        ctx.bezierCurveTo(1.70601E2, 2.02801E2, 1.56601E2, 1.96401E2, 1.56601E2, 1.96401E2);
        ctx.bezierCurveTo(1.46601E2, 1.62801E2, 1.60601E2, 1.71201E2, 1.60601E2, 1.71201E2);
        ctx.bezierCurveTo(1.63401E2, 1.76801E2, 1.74201E2, 1.82001E2, 1.74201E2, 1.82001E2);
        ctx.lineTo(1.77801E2, 1.79601E2);
        ctx.bezierCurveTo(1.76201E2, 1.74801E2, 1.84601E2, 1.68801E2, 1.84601E2, 1.68801E2);
        ctx.bezierCurveTo(1.87401E2, 1.75201E2, 1.93401E2, 1.67201E2, 1.93401E2, 1.67201E2);
        ctx.bezierCurveTo(1.97001E2, 1.42801E2, 2.09401E2, 1.57201E2, 2.09401E2, 1.57201E2);
        ctx.bezierCurveTo(2.13401E2, 1.58401E2, 2.14601E2, 1.51601E2, 2.14601E2, 1.51601E2);
        ctx.bezierCurveTo(2.18201E2, 1.41201E2, 2.14601E2, 1.27601E2, 2.14601E2, 1.27601E2);
        ctx.bezierCurveTo(2.18201E2, 1.27201E2, 2.27801E2, 1.33201E2, 2.27801E2, 1.33201E2);
        ctx.bezierCurveTo(2.30601E2, 1.29601E2, 2.21401E2, 1.12801E2, 2.25401E2, 1.15201E2);
        ctx.bezierCurveTo(2.29401E2, 1.17601E2, 2.33801E2, 1.19201E2, 2.33801E2, 1.19201E2);
        ctx.bezierCurveTo(2.34601E2, 1.17201E2, 2.24601E2, 1.04801E2, 2.24601E2, 1.04801E2);
        ctx.bezierCurveTo(2.20201E2, 1.02E2, 2.15001E2, 8.16E1, 2.15001E2, 8.16E1);
        ctx.bezierCurveTo(2.22201E2, 8.52E1, 2.12201E2, 7E1, 2.12201E2, 7E1);
        ctx.bezierCurveTo(2.12201E2, 6.68E1, 2.18201E2, 5.56E1, 2.18201E2, 5.56E1);
        ctx.bezierCurveTo(2.17401E2, 4.88E1, 2.18201E2, 4.92E1, 2.18201E2, 4.92E1);
        ctx.bezierCurveTo(2.21001E2, 5.04E1, 2.29001E2, 5.2E1, 2.22201E2, 4.56E1);
        ctx.bezierCurveTo(2.15401E2, 3.92E1, 2.23001E2, 3.44E1, 2.23001E2, 3.44E1);
        ctx.bezierCurveTo(2.27401E2, 3.16E1, 2.13801E2, 3.2E1, 2.13801E2, 3.2E1);
        ctx.bezierCurveTo(2.08601E2, 2.76E1, 2.09001E2, 2.36E1, 2.09001E2, 2.36E1);
        ctx.bezierCurveTo(2.17001E2, 2.56E1, 2.02601E2, 1.12E1, 2.00201E2, 7.6E0);
        ctx.bezierCurveTo(1.97801E2, 4E0, 2.07401E2, (-1.2E0), 2.07401E2, (-1.2E0));
        ctx.bezierCurveTo(2.20601E2, (-4.8E0), 2.09001E2, (-8E0), 2.09001E2, (-8E0));
        ctx.bezierCurveTo(1.89401E2, (-7.6E0), 2.00201E2, (-1.84E1), 2.00201E2, (-1.84E1));
        ctx.bezierCurveTo(2.06201E2, (-1.8E1), 2.04601E2, (-2.04E1), 2.04601E2, (-2.04E1));
        ctx.bezierCurveTo(1.99401E2, (-2.16E1), 1.89801E2, (-2.8E1), 1.89801E2, (-2.8E1));
        ctx.bezierCurveTo(1.85801E2, (-3.16E1), 1.89401E2, (-3.08E1), 1.89401E2, (-3.08E1));
        ctx.bezierCurveTo(2.06201E2, (-2.96E1), 1.77401E2, (-4.08E1), 1.77401E2, (-4.08E1));
        ctx.bezierCurveTo(1.85401E2, (-4.08E1), 1.67401E2, (-5.12E1), 1.67401E2, (-5.12E1));
        ctx.bezierCurveTo(1.65401E2, (-5.28E1), 1.62201E2, (-6.04E1), 1.62201E2, (-6.04E1));
        ctx.bezierCurveTo(1.56201E2, (-6.56E1), 1.51401E2, (-7.24E1), 1.51401E2, (-7.24E1));
        ctx.bezierCurveTo(1.51001E2, (-7.68E1), 1.46201E2, (-8.16E1), 1.46201E2, (-8.16E1));
        ctx.bezierCurveTo(1.34601E2, (-9.52E1), 1.29001E2, (-9.48E1), 1.29001E2, (-9.48E1));
        ctx.bezierCurveTo(1.14201E2, (-9.84E1), 1.09001E2, (-9.76E1), 1.09001E2, (-9.76E1));
        ctx.lineTo(5.62E1, (-9.32E1));
        ctx.bezierCurveTo(2.98E1, (-8.04E1), 3.76E1, (-5.94E1), 3.76E1, (-5.94E1));
        ctx.bezierCurveTo(4.4E1, (-5.1E1), 5.32E1, (-5.48E1), 5.32E1, (-5.48E1));
        ctx.bezierCurveTo(5.78E1, (-6.1E1), 6.94E1, (-5.88E1), 6.94E1, (-5.88E1));
        ctx.bezierCurveTo(8.9801E1, (-5.56E1), 8.7201E1, (-5.92E1), 8.7201E1, (-5.92E1));
        ctx.bezierCurveTo(8.4801E1, (-6.38E1), 6.86E1, (-7E1), 6.84E1, (-7.06E1));
        ctx.bezierCurveTo(6.82E1, (-7.12E1), 5.94E1, (-7.46E1), 5.94E1, (-7.46E1));
        ctx.bezierCurveTo(5.64E1, (-7.58E1), 5.2E1, (-8.5E1), 5.2E1, (-8.5E1));
        ctx.bezierCurveTo(4.88E1, (-8.84E1), 6.46E1, (-8.26E1), 6.46E1, (-8.26E1));
        ctx.bezierCurveTo(6.34E1, (-8.16E1), 7.08E1, (-7.76E1), 7.08E1, (-7.76E1));
        ctx.bezierCurveTo(8.8201E1, (-7.86E1), 9.8801E1, (-6.78E1), 9.8801E1, (-6.78E1));
        ctx.bezierCurveTo(1.09601E2, (-5.12E1), 1.09801E2, (-5.94E1), 1.09801E2, (-5.94E1));
        ctx.bezierCurveTo(1.12601E2, (-6.88E1), 1.00801E2, (-9E1), 1.00801E2, (-9E1));
        ctx.bezierCurveTo(1.01201E2, (-9.2E1), 1.09401E2, (-8.54E1), 1.09401E2, (-8.54E1));
        ctx.bezierCurveTo(1.10801E2, (-8.74E1), 1.11601E2, (-8.16E1), 1.11601E2, (-8.16E1));
        ctx.bezierCurveTo(1.11801E2, (-7.92E1), 1.15601E2, (-7.12E1), 1.15601E2, (-7.12E1));
        ctx.bezierCurveTo(1.18401E2, (-5.82E1), 1.22001E2, (-6.56E1), 1.22001E2, (-6.56E1));
        ctx.lineTo(1.26601E2, (-5.62E1));
        ctx.bezierCurveTo(1.28001E2, (-5.36E1), 1.22001E2, (-4.6E1), 1.22001E2, (-4.6E1));
        ctx.bezierCurveTo(1.21801E2, (-4.32E1), 1.22601E2, (-4.34E1), 1.17001E2, (-3.58E1));
        ctx.bezierCurveTo(1.11401E2, (-2.82E1), 1.14801E2, (-2.38E1), 1.14801E2, (-2.38E1));
        ctx.bezierCurveTo(1.13401E2, (-1.72E1), 1.22201E2, (-1.76E1), 1.22201E2, (-1.76E1));
        ctx.bezierCurveTo(1.24801E2, (-1.54E1), 1.28201E2, (-1.54E1), 1.28201E2, (-1.54E1));
        ctx.bezierCurveTo(1.30001E2, (-1.34E1), 1.32401E2, (-1.4E1), 1.32401E2, (-1.4E1));
        ctx.bezierCurveTo(1.34001E2, (-1.78E1), 1.40201E2, (-1.58E1), 1.40201E2, (-1.58E1));
        ctx.bezierCurveTo(1.41601E2, (-1.82E1), 1.49801E2, (-1.86E1), 1.49801E2, (-1.86E1));
        ctx.bezierCurveTo(1.50801E2, (-2.12E1), 1.51201E2, (-2.28E1), 1.54601E2, (-2.34E1));
        ctx.bezierCurveTo(1.58001E2, (-2.4E1), 1.33401E2, (-6.7E1), 1.33401E2, (-6.7E1));
        ctx.bezierCurveTo(1.39801E2, (-6.78E1), 1.31601E2, (-8.02E1), 1.31601E2, (-8.02E1));
        ctx.bezierCurveTo(1.29401E2, (-8.68E1), 1.40801E2, (-7.22E1), 1.43001E2, (-7.08E1));
        ctx.bezierCurveTo(1.45201E2, (-6.94E1), 1.46201E2, (-6.72E1), 1.44601E2, (-6.74E1));
        ctx.bezierCurveTo(1.43001E2, (-6.76E1), 1.41201E2, (-6.54E1), 1.42601E2, (-6.52E1));
        ctx.bezierCurveTo(1.44001E2, (-6.5E1), 1.57001E2, (-5E1), 1.60401E2, (-3.98E1));
        ctx.bezierCurveTo(1.63801E2, (-2.96E1), 1.69801E2, (-2.56E1), 1.76001E2, (-1.96E1));
        ctx.bezierCurveTo(1.82201E2, (-1.36E1), 1.81401E2, 1.06E1, 1.81401E2, 1.06E1);
        ctx.bezierCurveTo(1.81001E2, 1.94E1, 1.87001E2, 3E1, 1.87001E2, 3E1);
        ctx.bezierCurveTo(1.89001E2, 3.38E1, 1.84801E2, 5.2E1, 1.84801E2, 5.2E1);
        ctx.bezierCurveTo(1.82801E2, 5.42E1, 1.84201E2, 5.5E1, 1.84201E2, 5.5E1);
        ctx.bezierCurveTo(1.85201E2, 5.62E1, 1.92001E2, 6.94E1, 1.92001E2, 6.94E1);
        ctx.bezierCurveTo(1.90201E2, 6.92E1, 1.93801E2, 7.28E1, 1.93801E2, 7.28E1);
        ctx.bezierCurveTo(1.99001E2, 7.88E1, 1.92601E2, 7.58E1, 1.92601E2, 7.58E1);
        ctx.bezierCurveTo(1.86601E2, 7.42E1, 1.93601E2, 8.4E1, 1.93601E2, 8.4E1);
        ctx.bezierCurveTo(1.94801E2, 8.58E1, 1.85801E2, 8.12E1, 1.85801E2, 8.12E1);
        ctx.bezierCurveTo(1.76601E2, 8.06E1, 1.88201E2, 8.78E1, 1.88201E2, 8.78E1);
        ctx.bezierCurveTo(1.96801E2, 9.5E1, 1.85401E2, 9.06E1, 1.85401E2, 9.06E1);
        ctx.bezierCurveTo(1.80801E2, 8.88E1, 1.84001E2, 9.56E1, 1.84001E2, 9.56E1);
        ctx.bezierCurveTo(1.87201E2, 9.72E1, 2.04401E2, 1.042E2, 2.04401E2, 1.042E2);
        ctx.bezierCurveTo(2.04801E2, 1.08001E2, 2.01801E2, 1.13001E2, 2.01801E2, 1.13001E2);
        ctx.bezierCurveTo(2.02201E2, 1.17001E2, 2.00001E2, 1.20401E2, 2.00001E2, 1.20401E2);
        ctx.bezierCurveTo(1.98801E2, 1.28601E2, 1.98201E2, 1.29401E2, 1.98201E2, 1.29401E2);
        ctx.bezierCurveTo(1.94001E2, 1.29601E2, 1.86601E2, 1.43401E2, 1.86601E2, 1.43401E2);
        ctx.bezierCurveTo(1.84801E2, 1.46001E2, 1.74601E2, 1.58001E2, 1.74601E2, 1.58001E2);
        ctx.bezierCurveTo(1.72601E2, 1.65001E2, 1.54601E2, 1.57801E2, 1.54601E2, 1.57801E2);
        ctx.bezierCurveTo(1.48001E2, 1.61201E2, 1.50001E2, 1.57801E2, 1.50001E2, 1.57801E2);
        ctx.bezierCurveTo(1.49601E2, 1.55601E2, 1.54401E2, 1.49601E2, 1.54401E2, 1.49601E2);
        ctx.bezierCurveTo(1.61401E2, 1.47001E2, 1.58801E2, 1.36201E2, 1.58801E2, 1.36201E2);
        ctx.bezierCurveTo(1.62801E2, 1.34801E2, 1.51601E2, 1.32001E2, 1.51801E2, 1.30801E2);
        ctx.bezierCurveTo(1.52001E2, 1.29601E2, 1.57801E2, 1.28201E2, 1.57801E2, 1.28201E2);
        ctx.bezierCurveTo(1.65801E2, 1.26201E2, 1.61401E2, 1.23801E2, 1.61401E2, 1.23801E2);
        ctx.bezierCurveTo(1.60801E2, 1.19801E2, 1.63801E2, 1.14201E2, 1.63801E2, 1.14201E2);
        ctx.bezierCurveTo(1.75401E2, 1.13401E2, 1.63801E2, 9.72E1, 1.63801E2, 9.72E1);
        ctx.bezierCurveTo(1.53001E2, 8.96E1, 1.52001E2, 8.38E1, 1.52001E2, 8.38E1);
        ctx.bezierCurveTo(1.64601E2, 7.56E1, 1.56401E2, 6.32E1, 1.56601E2, 5.96E1);
        ctx.bezierCurveTo(1.56801E2, 5.6E1, 1.58001E2, 3.44E1, 1.58001E2, 3.44E1);
        ctx.bezierCurveTo(1.56001E2, 2.82E1, 1.53001E2, 1.46E1, 1.53001E2, 1.46E1);
        ctx.bezierCurveTo(1.55201E2, 9.4E0, 1.62601E2, (-3.2E0), 1.62601E2, (-3.2E0));
        ctx.bezierCurveTo(1.65401E2, (-7.4E0), 1.74201E2, (-1.22E1), 1.72001E2, (-1.52E1));
        ctx.bezierCurveTo(1.69801E2, (-1.82E1), 1.62001E2, (-1.64E1), 1.62001E2, (-1.64E1));
        ctx.bezierCurveTo(1.54201E2, (-1.78E1), 1.54801E2, (-1.26E1), 1.54801E2, (-1.26E1));
        ctx.bezierCurveTo(1.53201E2, (-1.16E1), 1.52401E2, (-6.6E0), 1.52401E2, (-6.6E0));
        ctx.bezierCurveTo(1.5168E2, 1.333E0, 1.42801E2, 7.6E0, 1.42801E2, 7.6E0);
        ctx.bezierCurveTo(1.31601E2, 1.38E1, 1.40801E2, 1.78E1, 1.40801E2, 1.78E1);
        ctx.bezierCurveTo(1.46801E2, 2.44E1, 1.37001E2, 2.46E1, 1.37001E2, 2.46E1);
        ctx.bezierCurveTo(1.26001E2, 2.28E1, 1.34201E2, 3.3E1, 1.34201E2, 3.3E1);
        ctx.bezierCurveTo(1.45001E2, 4.58E1, 1.42001E2, 4.86E1, 1.42001E2, 4.86E1);
        ctx.bezierCurveTo(1.31801E2, 4.96E1, 1.44401E2, 5.88E1, 1.44401E2, 5.88E1);
        ctx.bezierCurveTo(1.44401E2, 5.88E1, 1.43601E2, 5.68E1, 1.43801E2, 5.86E1);
        ctx.bezierCurveTo(1.44001E2, 6.04E1, 1.47001E2, 6.46E1, 1.47801E2, 6.66E1);
        ctx.bezierCurveTo(1.48601E2, 6.86E1, 1.44601E2, 6.88E1, 1.44601E2, 6.88E1);
        ctx.bezierCurveTo(1.45201E2, 7.84E1, 1.29801E2, 7.42E1, 1.29801E2, 7.42E1);
        ctx.bezierCurveTo(1.29801E2, 7.42E1, 1.29801E2, 7.42E1, 1.28201E2, 7.44E1);
        ctx.bezierCurveTo(1.26601E2, 7.46E1, 1.15401E2, 7.38E1, 1.09601E2, 7.16E1);
        ctx.bezierCurveTo(1.03801E2, 6.94E1, 9.7001E1, 6.94E1, 9.7001E1, 6.94E1);
        ctx.bezierCurveTo(9.7001E1, 6.94E1, 9.3001E1, 7.12E1, 8.54E1, 7.1E1);
        ctx.bezierCurveTo(7.78E1, 7.08E1, 6.98E1, 7.36E1, 6.98E1, 7.36E1);
        ctx.bezierCurveTo(6.54E1, 7.32E1, 7.4E1, 6.88E1, 7.42E1, 6.9E1);
        ctx.bezierCurveTo(7.44E1, 6.92E1, 8E1, 6.36E1, 7.2E1, 6.42E1);
        ctx.bezierCurveTo(5.0203E1, 6.5835E1, 3.94E1, 5.56E1, 3.94E1, 5.56E1);
        ctx.bezierCurveTo(3.74E1, 5.42E1, 3.48E1, 5.14E1, 3.48E1, 5.14E1);
        ctx.bezierCurveTo(2.48E1, 4.94E1, 3.62E1, 6.38E1, 3.62E1, 6.38E1);
        ctx.bezierCurveTo(3.74E1, 6.52E1, 3.6E1, 6.62E1, 3.6E1, 6.62E1);
        ctx.bezierCurveTo(3.52E1, 6.46E1, 2.74E1, 5.92E1, 2.74E1, 5.92E1);
        ctx.bezierCurveTo(2.4589E1, 5.8227E1, 2.3226E1, 5.6893E1, 2.0895E1, 5.4407E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#4c0000';
        ctx.fillStyle = 'rgba(76,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#4c0000';
        ctx.fillStyle = 'rgba(76,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-3E0), 4.28E1);
        ctx.bezierCurveTo((-3E0), 4.28E1, 8.6E0, 4.84E1, 1.12E1, 5.12E1);
        ctx.bezierCurveTo(1.38E1, 5.4E1, 2.78E1, 6.54E1, 2.78E1, 6.54E1);
        ctx.bezierCurveTo(2.78E1, 6.54E1, 2.24E1, 6.34E1, 1.98E1, 6.16E1);
        ctx.bezierCurveTo(1.72E1, 5.98E1, 6.4E0, 5.16E1, 6.4E0, 5.16E1);
        ctx.bezierCurveTo(6.4E0, 5.16E1, 2.6E0, 4.56E1, (-3E0), 4.28E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#99cc32';
        ctx.fillStyle = 'rgba(153,204,50,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#99cc32';
        ctx.fillStyle = 'rgba(153,204,50,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-6.1009E1), 1.1603E1);
        ctx.bezierCurveTo((-6.0672E1), 1.1455E1, (-6.1196E1), 8.743E0, (-6.14E1), 8.2E0);
        ctx.bezierCurveTo((-6.2422E1), 5.474E0, (-7.14E1), 4E0, (-7.14E1), 4E0);
        ctx.bezierCurveTo((-7.1627E1), 5.365E0, (-7.1682E1), 6.961E0, (-7.1576E1), 8.599E0);
        ctx.bezierCurveTo((-7.1576E1), 8.599E0, (-6.6708E1), 1.4118E1, (-6.1009E1), 1.1603E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#659900';
        ctx.fillStyle = 'rgba(101,153,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#659900';
        ctx.fillStyle = 'rgba(101,153,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-6.1009E1), 1.1403E1);
        ctx.bezierCurveTo((-6.1458E1), 1.1561E1, (-6.1024E1), 8.669E0, (-6.12E1), 8.2E0);
        ctx.bezierCurveTo((-6.2222E1), 5.474E0, (-7.14E1), 3.9E0, (-7.14E1), 3.9E0);
        ctx.bezierCurveTo((-7.1627E1), 5.265E0, (-7.1682E1), 6.861E0, (-7.1576E1), 8.499E0);
        ctx.bezierCurveTo((-7.1576E1), 8.499E0, (-6.7308E1), 1.3618E1, (-6.1009E1), 1.1403E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-6.54E1), 1.1546E1);
        ctx.bezierCurveTo((-6.6025E1), 1.1546E1, (-6.6531E1), 1.0406E1, (-6.6531E1), 9E0);
        ctx.bezierCurveTo((-6.6531E1), 7.595E0, (-6.6025E1), 6.455E0, (-6.54E1), 6.455E0);
        ctx.bezierCurveTo((-6.4775E1), 6.455E0, (-6.4268E1), 7.595E0, (-6.4268E1), 9E0);
        ctx.bezierCurveTo((-6.4268E1), 1.0406E1, (-6.4775E1), 1.1546E1, (-6.54E1), 1.1546E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-6.54E1), 9E0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.11E2), 1.09601E2);
        ctx.bezierCurveTo((-1.11E2), 1.09601E2, (-1.166E2), 1.19601E2, (-9.18E1), 1.13601E2);
        ctx.bezierCurveTo((-9.18E1), 1.13601E2, (-7.78E1), 1.12401E2, (-7.54E1), 1.10001E2);
        ctx.bezierCurveTo((-7.42E1), 1.10801E2, (-6.5834E1), 1.13734E2, (-6.3E1), 1.14401E2);
        ctx.bezierCurveTo((-5.62E1), 1.16001E2, (-4.78E1), 1.06E2, (-4.78E1), 1.06E2);
        ctx.bezierCurveTo((-4.78E1), 1.06E2, (-4.32E1), 9.55E1, (-4.04E1), 9.55E1);
        ctx.bezierCurveTo((-3.76E1), 9.55E1, (-4.08E1), 9.71E1, (-4.08E1), 9.71E1);
        ctx.bezierCurveTo((-4.08E1), 9.71E1, (-4.74E1), 1.07201E2, (-4.7E1), 1.08801E2);
        ctx.bezierCurveTo((-4.7E1), 1.08801E2, (-5.22E1), 1.28801E2, (-6.82E1), 1.29601E2);
        ctx.bezierCurveTo((-6.82E1), 1.29601E2, (-8.435E1), 1.30551E2, (-8.3E1), 1.36401E2);
        ctx.bezierCurveTo((-8.3E1), 1.36401E2, (-7.42E1), 1.34001E2, (-7.18E1), 1.36401E2);
        ctx.bezierCurveTo((-7.18E1), 1.36401E2, (-6.1E1), 1.36001E2, (-6.9E1), 1.42401E2);
        ctx.lineTo((-7.58E1), 1.54001E2);
        ctx.bezierCurveTo((-7.58E1), 1.54001E2, (-7.566E1), 1.57919E2, (-8.58E1), 1.54401E2);
        ctx.bezierCurveTo((-9.56E1), 1.51001E2, (-1.059E2), 1.38101E2, (-1.059E2), 1.38101E2);
        ctx.bezierCurveTo((-1.059E2), 1.38101E2, (-1.2185E2), 1.23551E2, (-1.11E2), 1.09601E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#e59999';
        ctx.fillStyle = 'rgba(229,153,153,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#e59999';
        ctx.fillStyle = 'rgba(229,153,153,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.122E2), 1.13601E2);
        ctx.bezierCurveTo((-1.122E2), 1.13601E2, (-1.142E2), 1.23201E2, (-7.74E1), 1.12801E2);
        ctx.bezierCurveTo((-7.74E1), 1.12801E2, (-7.3E1), 1.12801E2, (-7.06E1), 1.13601E2);
        ctx.bezierCurveTo((-6.82E1), 1.14401E2, (-5.62E1), 1.17201E2, (-5.42E1), 1.16001E2);
        ctx.bezierCurveTo((-5.42E1), 1.16001E2, (-6.14E1), 1.29601E2, (-7.3E1), 1.28001E2);
        ctx.bezierCurveTo((-7.3E1), 1.28001E2, (-8.62E1), 1.29601E2, (-8.58E1), 1.34401E2);
        ctx.bezierCurveTo((-8.58E1), 1.34401E2, (-8.18E1), 1.41601E2, (-7.7E1), 1.44001E2);
        ctx.bezierCurveTo((-7.7E1), 1.44001E2, (-7.42E1), 1.46401E2, (-7.46E1), 1.49601E2);
        ctx.bezierCurveTo((-7.5E1), 1.52801E2, (-7.78E1), 1.54401E2, (-7.98E1), 1.55201E2);
        ctx.bezierCurveTo((-8.18E1), 1.56001E2, (-8.5E1), 1.52801E2, (-8.66E1), 1.52801E2);
        ctx.bezierCurveTo((-8.82E1), 1.52801E2, (-9.66E1), 1.46401E2, (-1.01E2), 1.41601E2);
        ctx.bezierCurveTo((-1.054E2), 1.36801E2, (-1.138E2), 1.24801E2, (-1.134E2), 1.22001E2);
        ctx.bezierCurveTo((-1.13E2), 1.19201E2, (-1.122E2), 1.13601E2, (-1.122E2), 1.13601E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#b26565';
        ctx.fillStyle = 'rgba(178,101,101,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#b26565';
        ctx.fillStyle = 'rgba(178,101,101,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.09E2), 1.31051E2);
        ctx.bezierCurveTo((-1.064E2), 1.35001E2, (-1.032E2), 1.39201E2, (-1.01E2), 1.41601E2);
        ctx.bezierCurveTo((-9.66E1), 1.46401E2, (-8.82E1), 1.52801E2, (-8.66E1), 1.52801E2);
        ctx.bezierCurveTo((-8.5E1), 1.52801E2, (-8.18E1), 1.56001E2, (-7.98E1), 1.55201E2);
        ctx.bezierCurveTo((-7.78E1), 1.54401E2, (-7.5E1), 1.52801E2, (-7.46E1), 1.49601E2);
        ctx.bezierCurveTo((-7.42E1), 1.46401E2, (-7.7E1), 1.44001E2, (-7.7E1), 1.44001E2);
        ctx.bezierCurveTo((-8.0066E1), 1.42468E2, (-8.2806E1), 1.38976E2, (-8.4385E1), 1.36653E2);
        ctx.bezierCurveTo((-8.4385E1), 1.36653E2, (-8.42E1), 1.39201E2, (-8.94E1), 1.38401E2);
        ctx.bezierCurveTo((-9.46E1), 1.37601E2, (-9.98E1), 1.34801E2, (-1.014E2), 1.31601E2);
        ctx.bezierCurveTo((-1.03E2), 1.28401E2, (-1.054E2), 1.26001E2, (-1.038E2), 1.29601E2);
        ctx.bezierCurveTo((-1.022E2), 1.33201E2, (-9.98E1), 1.36801E2, (-9.82E1), 1.37201E2);
        ctx.bezierCurveTo((-9.66E1), 1.37601E2, (-9.7E1), 1.38801E2, (-9.94E1), 1.38401E2);
        ctx.bezierCurveTo((-1.018E2), 1.38001E2, (-1.046E2), 1.37601E2, (-1.09E2), 1.32401E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#992600';
        ctx.fillStyle = 'rgba(153,38,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#992600';
        ctx.fillStyle = 'rgba(153,38,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.116E2), 1.10001E2);
        ctx.bezierCurveTo((-1.116E2), 1.10001E2, (-1.098E2), 9.64E1, (-1.086E2), 9.24E1);
        ctx.bezierCurveTo((-1.086E2), 9.24E1, (-1.094E2), 8.56E1, (-1.07E2), 8.14E1);
        ctx.bezierCurveTo((-1.046E2), 7.72E1, (-1.026E2), 7.1E1, (-9.96E1), 6.56E1);
        ctx.bezierCurveTo((-9.66E1), 6.02E1, (-9.64E1), 5.62E1, (-9.24E1), 5.46E1);
        ctx.bezierCurveTo((-8.84E1), 5.3E1, (-8.24E1), 4.44E1, (-7.96E1), 4.34E1);
        ctx.bezierCurveTo((-7.68E1), 4.24E1, (-7.7E1), 4.32E1, (-7.7E1), 4.32E1);
        ctx.bezierCurveTo((-7.7E1), 4.32E1, (-7.02E1), 2.84E1, (-5.66E1), 3.24E1);
        ctx.bezierCurveTo((-5.66E1), 3.24E1, (-7.28E1), 2.96E1, (-5.7E1), 2.02E1);
        ctx.bezierCurveTo((-5.7E1), 2.02E1, (-6.18E1), 2.13E1, (-5.85E1), 1.43E1);
        ctx.bezierCurveTo((-5.6299E1), 9.632E0, (-5.68E1), 1.64E1, (-6.78E1), 2.82E1);
        ctx.bezierCurveTo((-6.78E1), 2.82E1, (-7.28E1), 3.68E1, (-7.8E1), 3.98E1);
        ctx.bezierCurveTo((-8.32E1), 4.28E1, (-9.52E1), 4.98E1, (-9.64E1), 5.36E1);
        ctx.bezierCurveTo((-9.76E1), 5.74E1, (-1.008E2), 6.32E1, (-1.028E2), 6.48E1);
        ctx.bezierCurveTo((-1.048E2), 6.64E1, (-1.076E2), 7.06E1, (-1.08E2), 7.4E1);
        ctx.bezierCurveTo((-1.08E2), 7.4E1, (-1.092E2), 7.8E1, (-1.106E2), 7.92E1);
        ctx.bezierCurveTo((-1.12E2), 8.04E1, (-1.122E2), 8.36E1, (-1.122E2), 8.56E1);
        ctx.bezierCurveTo((-1.122E2), 8.76E1, (-1.142E2), 9.04E1, (-1.14E2), 9.28E1);
        ctx.bezierCurveTo((-1.14E2), 9.28E1, (-1.132E2), 1.11801E2, (-1.136E2), 1.13801E2);
        ctx.lineTo((-1.116E2), 1.10001E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.202E2), 1.14601E2);
        ctx.bezierCurveTo((-1.202E2), 1.14601E2, (-1.222E2), 1.13201E2, (-1.266E2), 1.19201E2);
        ctx.bezierCurveTo((-1.266E2), 1.19201E2, (-1.193E2), 1.52201E2, (-1.193E2), 1.53601E2);
        ctx.bezierCurveTo((-1.193E2), 1.53601E2, (-1.182E2), 1.51501E2, (-1.195E2), 1.44301E2);
        ctx.bezierCurveTo((-1.208E2), 1.37101E2, (-1.217E2), 1.24401E2, (-1.217E2), 1.24401E2);
        ctx.lineTo((-1.202E2), 1.14601E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#992600';
        ctx.fillStyle = 'rgba(153,38,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#992600';
        ctx.fillStyle = 'rgba(153,38,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-9.86E1), 5.4E1);
        ctx.bezierCurveTo((-9.86E1), 5.4E1, (-1.162E2), 5.72E1, (-1.158E2), 8.64E1);
        ctx.lineTo((-1.166E2), 1.11201E2);
        ctx.bezierCurveTo((-1.166E2), 1.11201E2, (-1.178E2), 8.56E1, (-1.19E2), 8.4E1);
        ctx.bezierCurveTo((-1.202E2), 8.24E1, (-1.162E2), 7.12E1, (-1.194E2), 7.72E1);
        ctx.bezierCurveTo((-1.194E2), 7.72E1, (-1.334E2), 9.12E1, (-1.254E2), 1.12401E2);
        ctx.bezierCurveTo((-1.254E2), 1.12401E2, (-1.239E2), 1.15701E2, (-1.269E2), 1.11101E2);
        ctx.bezierCurveTo((-1.269E2), 1.11101E2, (-1.315E2), 9.85E1, (-1.304E2), 9.21E1);
        ctx.bezierCurveTo((-1.304E2), 9.21E1, (-1.302E2), 8.99E1, (-1.283E2), 8.71E1);
        ctx.bezierCurveTo((-1.283E2), 8.71E1, (-1.197E2), 7.54E1, (-1.17E2), 7.31E1);
        ctx.bezierCurveTo((-1.17E2), 7.31E1, (-1.152E2), 5.87E1, (-9.98E1), 5.35E1);
        ctx.bezierCurveTo((-9.98E1), 5.35E1, (-9.41E1), 5.12E1, (-9.86E1), 5.4E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(4.08E1, (-1.22E1));
        ctx.bezierCurveTo(4.146E1, (-1.2554E1), 4.1451E1, (-1.3524E1), 4.2031E1, (-1.3697E1));
        ctx.bezierCurveTo(4.318E1, (-1.4041E1), 4.3344E1, (-1.5108E1), 4.3862E1, (-1.5892E1));
        ctx.bezierCurveTo(4.4735E1, (-1.7211E1), 4.4928E1, (-1.8744E1), 4.551E1, (-2.0235E1));
        ctx.bezierCurveTo(4.5782E1, (-2.0935E1), 4.5809E1, (-2.189E1), 4.5496E1, (-2.255E1));
        ctx.bezierCurveTo(4.4322E1, (-2.5031E1), 4.362E1, (-2.748E1), 4.2178E1, (-2.9906E1));
        ctx.bezierCurveTo(4.191E1, (-3.0356E1), 4.1648E1, (-3.115E1), 4.1447E1, (-3.1748E1));
        ctx.bezierCurveTo(4.0984E1, (-3.3132E1), 3.9727E1, (-3.4123E1), 3.8867E1, (-3.5443E1));
        ctx.bezierCurveTo(3.8579E1, (-3.5884E1), 3.9104E1, (-3.6809E1), 3.8388E1, (-3.6893E1));
        ctx.bezierCurveTo(3.7491E1, (-3.6998E1), 3.6042E1, (-3.7578E1), 3.5809E1, (-3.6552E1));
        ctx.bezierCurveTo(3.5221E1, (-3.3965E1), 3.6232E1, (-3.1442E1), 3.72E1, (-2.9E1));
        ctx.bezierCurveTo(3.6418E1, (-2.8308E1), 3.6752E1, (-2.7387E1), 3.6904E1, (-2.662E1));
        ctx.bezierCurveTo(3.7614E1, (-2.3014E1), 3.6416E1, (-1.9662E1), 3.5655E1, (-1.6188E1));
        ctx.bezierCurveTo(3.5632E1, (-1.6084E1), 3.5974E1, (-1.5886E1), 3.5946E1, (-1.5824E1));
        ctx.bezierCurveTo(3.4724E1, (-1.3138E1), 3.3272E1, (-1.0693E1), 3.1453E1, (-8.312E0));
        ctx.bezierCurveTo(3.0695E1, (-7.32E0), 2.9823E1, (-6.404E0), 2.9326E1, (-5.341E0));
        ctx.bezierCurveTo(2.8958E1, (-4.554E0), 2.855E1, (-3.588E0), 2.88E1, (-2.6E0));
        ctx.bezierCurveTo(2.5365E1, 1.8E-1, 2.3115E1, 4.025E0, 2.0504E1, 7.871E0);
        ctx.bezierCurveTo(2.0042E1, 8.551E0, 2.0333E1, 9.76E0, 2.0884E1, 1.0029E1);
        ctx.bezierCurveTo(2.1697E1, 1.0427E1, 2.2653E1, 9.403E0, 2.3123E1, 8.557E0);
        ctx.bezierCurveTo(2.3512E1, 7.859E0, 2.3865E1, 7.209E0, 2.4356E1, 6.566E0);
        ctx.bezierCurveTo(2.4489E1, 6.391E0, 2.431E1, 5.972E0, 2.4445E1, 5.851E0);
        ctx.bezierCurveTo(2.7078E1, 3.504E0, 2.8747E1, 5.68E-1, 3.12E1, (-1.8E0));
        ctx.bezierCurveTo(3.315E1, (-2.129E0), 3.4687E1, (-3.127E0), 3.6435E1, (-4.14E0));
        ctx.bezierCurveTo(3.6743E1, (-4.319E0), 3.7267E1, (-4.07E0), 3.7557E1, (-4.265E0));
        ctx.bezierCurveTo(3.931E1, (-5.442E0), 3.9308E1, (-7.478E0), 3.9414E1, (-9.388E0));
        ctx.bezierCurveTo(3.9464E1, (-1.0272E1), 3.966E1, (-1.1589E1), 4.08E1, (-1.22E1));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(3.1959E1, (-1.6666E1));
        ctx.bezierCurveTo(3.2083E1, (-1.6743E1), 3.1928E1, (-1.7166E1), 3.2037E1, (-1.7382E1));
        ctx.bezierCurveTo(3.2199E1, (-1.7706E1), 3.2602E1, (-1.7894E1), 3.2764E1, (-1.8218E1));
        ctx.bezierCurveTo(3.2873E1, (-1.8434E1), 3.271E1, (-1.8814E1), 3.2846E1, (-1.8956E1));
        ctx.bezierCurveTo(3.5179E1, (-2.1403E1), 3.5436E1, (-2.4427E1), 3.44E1, (-2.74E1));
        ctx.bezierCurveTo(3.5424E1, (-2.802E1), 3.5485E1, (-2.9282E1), 3.506E1, (-3.0129E1));
        ctx.bezierCurveTo(3.4207E1, (-3.1829E1), 3.4014E1, (-3.3755E1), 3.3039E1, (-3.5298E1));
        ctx.bezierCurveTo(3.2237E1, (-3.6567E1), 3.0659E1, (-3.7811E1), 2.9288E1, (-3.6508E1));
        ctx.bezierCurveTo(2.8867E1, (-3.6108E1), 2.8546E1, (-3.5321E1), 2.8824E1, (-3.4609E1));
        ctx.bezierCurveTo(2.8888E1, (-3.4446E1), 2.9173E1, (-3.43E1), 2.9146E1, (-3.4218E1));
        ctx.bezierCurveTo(2.9039E1, (-3.3894E1), 2.8493E1, (-3.367E1), 2.8487E1, (-3.3398E1));
        ctx.bezierCurveTo(2.8457E1, (-3.1902E1), 2.7503E1, (-3.0391E1), 2.8133E1, (-2.9062E1));
        ctx.bezierCurveTo(2.8905E1, (-2.7433E1), 2.9724E1, (-2.5576E1), 3.04E1, (-2.38E1));
        ctx.bezierCurveTo(2.9166E1, (-2.1684E1), 3.0199E1, (-1.9235E1), 2.8446E1, (-1.7358E1));
        ctx.bezierCurveTo(2.831E1, (-1.7212E1), 2.8319E1, (-1.6826E1), 2.8441E1, (-1.6624E1));
        ctx.bezierCurveTo(2.8733E1, (-1.6138E1), 2.9139E1, (-1.5732E1), 2.9625E1, (-1.544E1));
        ctx.bezierCurveTo(2.9827E1, (-1.5319E1), 3.0175E1, (-1.5317E1), 3.0375E1, (-1.5441E1));
        ctx.bezierCurveTo(3.0953E1, (-1.5803E1), 3.1351E1, (-1.629E1), 3.1959E1, (-1.6666E1));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(9.4771E1, (-2.6977E1));
        ctx.bezierCurveTo(9.616E1, (-2.5185E1), 9.645E1, (-2.239E1), 9.4401E1, (-2.1E1));
        ctx.bezierCurveTo(9.4951E1, (-1.7691E1), 9.8302E1, (-1.967E1), 1.00401E2, (-2.02E1));
        ctx.bezierCurveTo(1.00292E2, (-2.0588E1), 1.00519E2, (-2.0932E1), 1.00802E2, (-2.0937E1));
        ctx.bezierCurveTo(1.01859E2, (-2.0952E1), 1.02539E2, (-2.1984E1), 1.03601E2, (-2.18E1));
        ctx.bezierCurveTo(1.04035E2, (-2.3357E1), 1.05673E2, (-2.4059E1), 1.06317E2, (-2.5439E1));
        ctx.bezierCurveTo(1.08043E2, (-2.9134E1), 1.07452E2, (-3.3407E1), 1.04868E2, (-3.6653E1));
        ctx.bezierCurveTo(1.04666E2, (-3.6907E1), 1.04883E2, (-3.7424E1), 1.04759E2, (-3.7786E1));
        ctx.bezierCurveTo(1.04003E2, (-3.9997E1), 1.01935E2, (-4.0312E1), 1.00001E2, (-4.1E1));
        ctx.bezierCurveTo(9.8824E1, (-4.4875E1), 9.8163E1, (-4.8906E1), 9.6401E1, (-5.26E1));
        ctx.bezierCurveTo(9.4787E1, (-5.285E1), 9.4089E1, (-5.4589E1), 9.2752E1, (-5.5309E1));
        ctx.bezierCurveTo(9.1419E1, (-5.6028E1), 9.0851E1, (-5.4449E1), 9.0892E1, (-5.3403E1));
        ctx.bezierCurveTo(9.0899E1, (-5.3198E1), 9.1351E1, (-5.2974E1), 9.1181E1, (-5.2609E1));
        ctx.bezierCurveTo(9.1105E1, (-5.2445E1), 9.0845E1, (-5.2334E1), 9.0845E1, (-5.22E1));
        ctx.bezierCurveTo(9.0846E1, (-5.2065E1), 9.1067E1, (-5.1934E1), 9.1201E1, (-5.18E1));
        ctx.bezierCurveTo(9.0283E1, (-5.098E1), 8.886E1, (-5.0503E1), 8.8565E1, (-4.9358E1));
        ctx.bezierCurveTo(8.7611E1, (-4.5648E1), 9.0184E1, (-4.2523E1), 9.1852E1, (-3.9322E1));
        ctx.bezierCurveTo(9.2443E1, (-3.8187E1), 9.1707E1, (-3.6916E1), 9.0947E1, (-3.5708E1));
        ctx.bezierCurveTo(9.0509E1, (-3.5013E1), 9.0617E1, (-3.3886E1), 9.0893E1, (-3.303E1));
        ctx.bezierCurveTo(9.1645E1, (-3.0699E1), 9.3236E1, (-2.896E1), 9.4771E1, (-2.6977E1));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(5.7611E1, (-8.591E0));
        ctx.bezierCurveTo(5.6124E1, (-6.74E0), 5.2712E1, (-4.171E0), 5.5629E1, (-2.243E0));
        ctx.bezierCurveTo(5.5823E1, (-2.114E0), 5.6193E1, (-2.11E0), 5.6366E1, (-2.244E0));
        ctx.bezierCurveTo(5.8387E1, (-3.809E0), 6.039E1, (-4.712E0), 6.2826E1, (-5.294E0));
        ctx.bezierCurveTo(6.295E1, (-5.323E0), 6.3224E1, (-4.856E0), 6.3593E1, (-5.017E0));
        ctx.bezierCurveTo(6.5206E1, (-5.72E0), 6.7216E1, (-5.662E0), 6.84E1, (-7E0));
        ctx.bezierCurveTo(7.2167E1, (-6.776E0), 7.5732E1, (-7.892E0), 7.9123E1, (-9.2E0));
        ctx.bezierCurveTo(8.0284E1, (-9.648E0), 8.1554E1, (-1.0207E1), 8.2755E1, (-1.0709E1));
        ctx.bezierCurveTo(8.4131E1, (-1.1285E1), 8.5335E1, (-1.2213E1), 8.6447E1, (-1.3354E1));
        ctx.bezierCurveTo(8.658E1, (-1.349E1), 8.6934E1, (-1.34E1), 8.7201E1, (-1.34E1));
        ctx.bezierCurveTo(8.7161E1, (-1.4263E1), 8.8123E1, (-1.439E1), 8.837E1, (-1.5012E1));
        ctx.bezierCurveTo(8.8462E1, (-1.5244E1), 8.8312E1, (-1.564E1), 8.8445E1, (-1.5742E1));
        ctx.bezierCurveTo(9.0583E1, (-1.7372E1), 9.1503E1, (-1.939E1), 9.0334E1, (-2.1767E1));
        ctx.bezierCurveTo(9.0049E1, (-2.2345E1), 8.98E1, (-2.2963E1), 8.9234E1, (-2.3439E1));
        ctx.bezierCurveTo(8.8149E1, (-2.435E1), 8.7047E1, (-2.3496E1), 8.6E1, (-2.38E1));
        ctx.bezierCurveTo(8.5841E1, (-2.3172E1), 8.5112E1, (-2.3344E1), 8.4726E1, (-2.3146E1));
        ctx.bezierCurveTo(8.3867E1, (-2.2707E1), 8.2534E1, (-2.3292E1), 8.1675E1, (-2.2854E1));
        ctx.bezierCurveTo(8.0313E1, (-2.2159E1), 7.9072E1, (-2.199E1), 7.765E1, (-2.1613E1));
        ctx.bezierCurveTo(7.7338E1, (-2.1531E1), 7.656E1, (-2.1627E1), 7.64E1, (-2.1E1));
        ctx.bezierCurveTo(7.6266E1, (-2.1134E1), 7.6118E1, (-2.1368E1), 7.6012E1, (-2.1346E1));
        ctx.bezierCurveTo(7.4104E1, (-2.095E1), 7.2844E1, (-2.0736E1), 7.1543E1, (-1.9044E1));
        ctx.bezierCurveTo(7.144E1, (-1.8911E1), 7.0998E1, (-1.909E1), 7.0839E1, (-1.8955E1));
        ctx.bezierCurveTo(6.9882E1, (-1.8147E1), 6.9477E1, (-1.6913E1), 6.8376E1, (-1.6241E1));
        ctx.bezierCurveTo(6.8175E1, (-1.6118E1), 6.7823E1, (-1.6286E1), 6.7629E1, (-1.6157E1));
        ctx.bezierCurveTo(6.6983E1, (-1.5726E1), 6.6616E1, (-1.5085E1), 6.5974E1, (-1.4638E1));
        ctx.bezierCurveTo(6.5645E1, (-1.4409E1), 6.5245E1, (-1.4734E1), 6.5277E1, (-1.499E1));
        ctx.bezierCurveTo(6.5522E1, (-1.6937E1), 6.6175E1, (-1.8724E1), 6.56E1, (-2.06E1));
        ctx.bezierCurveTo(6.7677E1, (-2.312E1), 7.0194E1, (-2.5069E1), 7.2E1, (-2.78E1));
        ctx.bezierCurveTo(7.2015E1, (-2.9966E1), 7.2707E1, (-3.2112E1), 7.2594E1, (-3.4189E1));
        ctx.bezierCurveTo(7.2584E1, (-3.4382E1), 7.2296E1, (-3.5115E1), 7.217E1, (-3.5462E1));
        ctx.bezierCurveTo(7.1858E1, (-3.6316E1), 7.2764E1, (-3.7382E1), 7.192E1, (-3.8106E1));
        ctx.bezierCurveTo(7.0516E1, (-3.9309E1), 6.9224E1, (-3.8433E1), 6.84E1, (-3.7E1));
        ctx.bezierCurveTo(6.6562E1, (-3.661E1), 6.4496E1, (-3.5917E1), 6.2918E1, (-3.7151E1));
        ctx.bezierCurveTo(6.1911E1, (-3.7938E1), 6.1333E1, (-3.8844E1), 6.0534E1, (-3.99E1));
        ctx.bezierCurveTo(5.9549E1, (-4.1202E1), 5.9884E1, (-4.2638E1), 5.9954E1, (-4.4202E1));
        ctx.bezierCurveTo(5.996E1, (-4.433E1), 5.9645E1, (-4.4466E1), 5.9645E1, (-4.46E1));
        ctx.bezierCurveTo(5.9646E1, (-4.4735E1), 5.9866E1, (-4.4866E1), 6E1, (-4.5E1));
        ctx.bezierCurveTo(5.9294E1, (-4.5626E1), 5.9019E1, (-4.6684E1), 5.8E1, (-4.7E1));
        ctx.bezierCurveTo(5.8305E1, (-4.8092E1), 5.7629E1, (-4.8976E1), 5.6758E1, (-4.9278E1));
        ctx.bezierCurveTo(5.4763E1, (-4.9969E1), 5.3086E1, (-4.8057E1), 5.1194E1, (-4.7984E1));
        ctx.bezierCurveTo(5.068E1, (-4.7965E1), 5.0213E1, (-4.9003E1), 4.9564E1, (-4.9328E1));
        ctx.bezierCurveTo(4.9132E1, (-4.9544E1), 4.8428E1, (-4.9577E1), 4.8066E1, (-4.9311E1));
        ctx.bezierCurveTo(4.7378E1, (-4.8807E1), 4.6789E1, (-4.8693E1), 4.6031E1, (-4.8488E1));
        ctx.bezierCurveTo(4.4414E1, (-4.8052E1), 4.3136E1, (-4.6958E1), 4.1656E1, (-4.6103E1));
        ctx.bezierCurveTo(4.0171E1, (-4.5246E1), 3.9216E1, (-4.3809E1), 3.8136E1, (-4.2489E1));
        ctx.bezierCurveTo(3.7195E1, (-4.1337E1), 3.7059E1, (-3.8923E1), 3.8479E1, (-3.8423E1));
        ctx.bezierCurveTo(4.0322E1, (-3.7773E1), 4.1626E1, (-4.0476E1), 4.3592E1, (-4.015E1));
        ctx.bezierCurveTo(4.3904E1, (-4.0099E1), 4.411E1, (-3.9788E1), 4.4E1, (-3.94E1));
        ctx.bezierCurveTo(4.4389E1, (-3.9291E1), 4.4607E1, (-3.952E1), 4.48E1, (-3.98E1));
        ctx.bezierCurveTo(4.5658E1, (-3.8781E1), 4.6822E1, (-3.8444E1), 4.776E1, (-3.7571E1));
        ctx.bezierCurveTo(4.873E1, (-3.6667E1), 5.0476E1, (-3.7085E1), 5.1491E1, (-3.6088E1));
        ctx.bezierCurveTo(5.302E1, (-3.4586E1), 5.2461E1, (-3.1905E1), 5.44E1, (-3.06E1));
        ctx.bezierCurveTo(5.3814E1, (-2.9287E1), 5.3207E1, (-2.801E1), 5.2872E1, (-2.6583E1));
        ctx.bezierCurveTo(5.259E1, (-2.5377E1), 5.3584E1, (-2.418E1), 5.4795E1, (-2.4271E1));
        ctx.bezierCurveTo(5.6053E1, (-2.4365E1), 5.6315E1, (-2.5124E1), 5.68E1, (-2.62E1));
        ctx.bezierCurveTo(5.7067E1, (-2.5933E1), 5.7536E1, (-2.5636E1), 5.7495E1, (-2.542E1));
        ctx.bezierCurveTo(5.7038E1, (-2.3033E1), 5.6011E1, (-2.104E1), 5.5553E1, (-1.8609E1));
        ctx.bezierCurveTo(5.5494E1, (-1.8292E1), 5.5189E1, (-1.809E1), 5.48E1, (-1.82E1));
        ctx.bezierCurveTo(5.4332E1, (-1.4051E1), 5.028E1, (-1.1657E1), 4.7735E1, (-8.492E0));
        ctx.bezierCurveTo(4.7332E1, (-7.99E0), 4.7328E1, (-6.741E0), 4.7737E1, (-6.338E0));
        ctx.bezierCurveTo(4.914E1, (-4.951E0), 5.11E1, (-6.497E0), 5.28E1, (-7E0));
        ctx.bezierCurveTo(5.3013E1, (-8.206E0), 5.3872E1, (-9.148E0), 5.5204E1, (-9.092E0));
        ctx.bezierCurveTo(5.546E1, (-9.082E0), 5.5695E1, (-9.624E0), 5.6019E1, (-9.754E0));
        ctx.bezierCurveTo(5.6367E1, (-9.892E0), 5.6869E1, (-9.668E0), 5.7155E1, (-9.866E0));
        ctx.bezierCurveTo(5.8884E1, (-1.1061E1), 6.0292E1, (-1.2167E1), 6.203E1, (-1.3356E1));
        ctx.bezierCurveTo(6.2222E1, (-1.3487E1), 6.2566E1, (-1.3328E1), 6.2782E1, (-1.3436E1));
        ctx.bezierCurveTo(6.3107E1, (-1.3598E1), 6.3294E1, (-1.3985E1), 6.3617E1, (-1.417E1));
        ctx.bezierCurveTo(6.3965E1, (-1.437E1), 6.4207E1, (-1.408E1), 6.44E1, (-1.38E1));
        ctx.bezierCurveTo(6.3754E1, (-1.3451E1), 6.375E1, (-1.2494E1), 6.3168E1, (-1.2292E1));
        ctx.bezierCurveTo(6.2393E1, (-1.2024E1), 6.1832E1, (-1.1511E1), 6.1158E1, (-1.1064E1));
        ctx.bezierCurveTo(6.0866E1, (-1.0871E1), 6.0207E1, (-1.1119E1), 6.0103E1, (-1.094E1));
        ctx.bezierCurveTo(5.9505E1, (-9.912E0), 5.8321E1, (-9.474E0), 5.7611E1, (-8.591E0));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(2.2E0, (-5.8E1));
        ctx.bezierCurveTo(2.2E0, (-5.8E1), (-7.038E0), (-6.0872E1), (-1.82E1), (-3.52E1));
        ctx.bezierCurveTo((-1.82E1), (-3.52E1), (-2.06E1), (-3E1), (-2.3E1), (-2.8E1));
        ctx.bezierCurveTo((-2.54E1), (-2.6E1), (-3.66E1), (-2.24E1), (-3.86E1), (-1.84E1));
        ctx.lineTo((-4.9E1), (-2.4E0));
        ctx.bezierCurveTo((-4.9E1), (-2.4E0), (-3.42E1), (-1.84E1), (-3.1E1), (-2.08E1));
        ctx.bezierCurveTo((-3.1E1), (-2.08E1), (-2.3E1), (-2.92E1), (-2.62E1), (-2.24E1));
        ctx.bezierCurveTo((-2.62E1), (-2.24E1), (-4.02E1), (-1.16E1), (-3.9E1), (-2.4E0));
        ctx.bezierCurveTo((-3.9E1), (-2.4E0), (-4.46E1), 1.2E1, (-4.54E1), 1.4E1);
        ctx.bezierCurveTo((-4.54E1), 1.4E1, (-2.94E1), (-1.8E1), (-2.7E1), (-1.92E1));
        ctx.bezierCurveTo((-2.46E1), (-2.04E1), (-2.34E1), (-2.04E1), (-2.46E1), (-1.68E1));
        ctx.bezierCurveTo((-2.58E1), (-1.32E1), (-2.62E1), 3.2E0, (-2.9E1), 5.2E0);
        ctx.bezierCurveTo((-2.9E1), 5.2E0, (-2.1E1), (-1.52E1), (-2.18E1), (-1.84E1));
        ctx.bezierCurveTo((-2.18E1), (-1.84E1), (-1.86E1), (-2.2E1), (-1.62E1), (-1.68E1));
        ctx.lineTo((-1.74E1), (-8E-1));
        ctx.lineTo((-1.3E1), 1.12E1);
        ctx.bezierCurveTo((-1.3E1), 1.12E1, (-1.54E1), 0E0, (-1.38E1), (-1.56E1));
        ctx.bezierCurveTo((-1.38E1), (-1.56E1), (-1.58E1), (-2.6E1), (-1.18E1), (-2.04E1));
        ctx.bezierCurveTo((-7.8E0), (-1.48E1), 1.8E0, (-8.8E0), 1.8E0, (-4E0));
        ctx.bezierCurveTo(1.8E0, (-4E0), (-3.4E0), (-2.16E1), (-1.26E1), (-2.64E1));
        ctx.lineTo((-1.66E1), (-2.04E1));
        ctx.lineTo((-1.78E1), (-2.24E1));
        ctx.bezierCurveTo((-1.78E1), (-2.24E1), (-2.14E1), (-2.32E1), (-1.7E1), (-3E1));
        ctx.bezierCurveTo((-1.26E1), (-3.68E1), (-1.3E1), (-3.76E1), (-1.3E1), (-3.76E1));
        ctx.bezierCurveTo((-1.3E1), (-3.76E1), (-6.6E0), (-3.04E1), (-5E0), (-3.04E1));
        ctx.bezierCurveTo((-5E0), (-3.04E1), 8.2E0, (-3.8E1), 9.4E0, (-1.36E1));
        ctx.bezierCurveTo(9.4E0, (-1.36E1), 1.62E1, (-2.8E1), 7E0, (-3.48E1));
        ctx.bezierCurveTo(7E0, (-3.48E1), (-7.8E0), (-3.68E1), (-6.6E0), (-4.2E1));
        ctx.lineTo(6E-1, (-5.44E1));
        ctx.bezierCurveTo(4.2E0, (-5.96E1), 2.6E0, (-5.68E1), 2.6E0, (-5.68E1));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.78E1), (-4.16E1));
        ctx.bezierCurveTo((-1.78E1), (-4.16E1), (-3.06E1), (-4.16E1), (-3.38E1), (-3.64E1));
        ctx.lineTo((-4.1E1), (-2.68E1));
        ctx.bezierCurveTo((-4.1E1), (-2.68E1), (-2.38E1), (-3.68E1), (-1.98E1), (-3.8E1));
        ctx.bezierCurveTo((-1.58E1), (-3.92E1), (-1.78E1), (-4.16E1), (-1.78E1), (-4.16E1));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-5.78E1), (-3.52E1));
        ctx.bezierCurveTo((-5.78E1), (-3.52E1), (-5.98E1), (-3.4E1), (-6.02E1), (-3.12E1));
        ctx.bezierCurveTo((-6.06E1), (-2.84E1), (-6.3E1), (-2.8E1), (-6.22E1), (-2.52E1));
        ctx.bezierCurveTo((-6.14E1), (-2.24E1), (-5.94E1), (-2E1), (-5.94E1), (-2.4E1));
        ctx.bezierCurveTo((-5.94E1), (-2.8E1), (-5.78E1), (-3E1), (-5.7E1), (-3.12E1));
        ctx.bezierCurveTo((-5.62E1), (-3.24E1), (-5.46E1), (-3.68E1), (-5.78E1), (-3.52E1));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-6.66E1), 2.6E1);
        ctx.bezierCurveTo((-6.66E1), 2.6E1, (-7.5E1), 2.2E1, (-7.82E1), 1.84E1);
        ctx.bezierCurveTo((-8.14E1), 1.48E1, (-8.0948E1), 1.9966E1, (-8.58E1), 1.96E1);
        ctx.bezierCurveTo((-9.1647E1), 1.9159E1, (-9.06E1), 3.2E0, (-9.06E1), 3.2E0);
        ctx.lineTo((-9.46E1), 1.08E1);
        ctx.bezierCurveTo((-9.46E1), 1.08E1, (-9.58E1), 2.52E1, (-8.78E1), 2.28E1);
        ctx.bezierCurveTo((-8.3893E1), 2.1628E1, (-8.26E1), 2.32E1, (-8.42E1), 2.4E1);
        ctx.bezierCurveTo((-8.58E1), 2.48E1, (-7.86E1), 2.52E1, (-8.14E1), 2.68E1);
        ctx.bezierCurveTo((-8.42E1), 2.84E1, (-6.98E1), 2.32E1, (-7.22E1), 3.36E1);
        ctx.lineTo((-6.66E1), 2.6E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-7.92E1), 4.04E1);
        ctx.bezierCurveTo((-7.92E1), 4.04E1, (-9.46E1), 4.48E1, (-9.82E1), 3.52E1);
        ctx.bezierCurveTo((-9.82E1), 3.52E1, (-1.03E2), 3.76E1, (-1.008E2), 4.06E1);
        ctx.bezierCurveTo((-9.86E1), 4.36E1, (-9.74E1), 4.4E1, (-9.74E1), 4.4E1);
        ctx.bezierCurveTo((-9.74E1), 4.4E1, (-9.2E1), 4.52E1, (-9.26E1), 4.6E1);
        ctx.bezierCurveTo((-9.32E1), 4.68E1, (-9.56E1), 5.02E1, (-9.56E1), 5.02E1);
        ctx.bezierCurveTo((-9.56E1), 5.02E1, (-8.54E1), 4.42E1, (-7.92E1), 4.04E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(1.49201E2, 1.18601E2);
        ctx.bezierCurveTo(1.48774E2, 1.20735E2, 1.47103E2, 1.21536E2, 1.45201E2, 1.22201E2);
        ctx.bezierCurveTo(1.43284E2, 1.21243E2, 1.40686E2, 1.18137E2, 1.38801E2, 1.20201E2);
        ctx.bezierCurveTo(1.38327E2, 1.19721E2, 1.37548E2, 1.19661E2, 1.37204E2, 1.18999E2);
        ctx.bezierCurveTo(1.36739E2, 1.18101E2, 1.37011E2, 1.17055E2, 1.36669E2, 1.16257E2);
        ctx.bezierCurveTo(1.36124E2, 1.14985E2, 1.35415E2, 1.13619E2, 1.35601E2, 1.12201E2);
        ctx.bezierCurveTo(1.37407E2, 1.11489E2, 1.38002E2, 1.09583E2, 1.37528E2, 1.0782E2);
        ctx.bezierCurveTo(1.37459E2, 1.07563E2, 1.3703E2, 1.07366E2, 1.3723E2, 1.07017E2);
        ctx.bezierCurveTo(1.37416E2, 1.06694E2, 1.37734E2, 1.06467E2, 1.38001E2, 1.062E2);
        ctx.bezierCurveTo(1.37866E2, 1.06335E2, 1.37721E2, 1.06568E2, 1.3761E2, 1.06548E2);
        ctx.bezierCurveTo(1.37E2, 1.06442E2, 1.37124E2, 1.05805E2, 1.37254E2, 1.05418E2);
        ctx.bezierCurveTo(1.37839E2, 1.03672E2, 1.39853E2, 1.03408E2, 1.41201E2, 1.046E2);
        ctx.bezierCurveTo(1.41457E2, 1.04035E2, 1.41966E2, 1.04229E2, 1.42401E2, 1.042E2);
        ctx.bezierCurveTo(1.42351E2, 1.03621E2, 1.42759E2, 1.03094E2, 1.42957E2, 1.02674E2);
        ctx.bezierCurveTo(1.43475E2, 1.01576E2, 1.45104E2, 1.02682E2, 1.45901E2, 1.0207E2);
        ctx.bezierCurveTo(1.46977E2, 1.01245E2, 1.4804E2, 1.00546E2, 1.49118E2, 1.01149E2);
        ctx.bezierCurveTo(1.50927E2, 1.02162E2, 1.52636E2, 1.03374E2, 1.53835E2, 1.05115E2);
        ctx.bezierCurveTo(1.5441E2, 1.05949E2, 1.5465E2, 1.0723E2, 1.54592E2, 1.08188E2);
        ctx.bezierCurveTo(1.54554E2, 1.08835E2, 1.53173E2, 1.08483E2, 1.5283E2, 1.09412E2);
        ctx.bezierCurveTo(1.52185E2, 1.1116E2, 1.54016E2, 1.11679E2, 1.54772E2, 1.13017E2);
        ctx.bezierCurveTo(1.5497E2, 1.13366E2, 1.54706E2, 1.1367E2, 1.54391E2, 1.13768E2);
        ctx.bezierCurveTo(1.5398E2, 1.13896E2, 1.53196E2, 1.13707E2, 1.53334E2, 1.1416E2);
        ctx.bezierCurveTo(1.54306E2, 1.17353E2, 1.5155E2, 1.18031E2, 1.49201E2, 1.18601E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(1.396E2, 1.38201E2);
        ctx.bezierCurveTo(1.39593E2, 1.36463E2, 1.37992E2, 1.34707E2, 1.39201E2, 1.33001E2);
        ctx.bezierCurveTo(1.39336E2, 1.33135E2, 1.39467E2, 1.33356E2, 1.39601E2, 1.33356E2);
        ctx.bezierCurveTo(1.39736E2, 1.33356E2, 1.39867E2, 1.33135E2, 1.40001E2, 1.33001E2);
        ctx.bezierCurveTo(1.41496E2, 1.35217E2, 1.45148E2, 1.36145E2, 1.45006E2, 1.38991E2);
        ctx.bezierCurveTo(1.44984E2, 1.39438E2, 1.43897E2, 1.40356E2, 1.44801E2, 1.41001E2);
        ctx.bezierCurveTo(1.42988E2, 1.42349E2, 1.42933E2, 1.44719E2, 1.42001E2, 1.46601E2);
        ctx.bezierCurveTo(1.40763E2, 1.46315E2, 1.39551E2, 1.45952E2, 1.38401E2, 1.45401E2);
        ctx.bezierCurveTo(1.38753E2, 1.43915E2, 1.38636E2, 1.42231E2, 1.39456E2, 1.40911E2);
        ctx.bezierCurveTo(1.3989E2, 1.40213E2, 1.39603E2, 1.39134E2, 1.396E2, 1.38201E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-2.66E1), 1.29201E2);
        ctx.bezierCurveTo((-2.66E1), 1.29201E2, (-4.3458E1), 1.39337E2, (-2.94E1), 1.24001E2);
        ctx.bezierCurveTo((-2.06E1), 1.14401E2, (-1.06E1), 1.08801E2, (-1.06E1), 1.08801E2);
        ctx.bezierCurveTo((-1.06E1), 1.08801E2, (-2E-1), 1.044E2, 3.4E0, 1.032E2);
        ctx.bezierCurveTo(7E0, 1.02E2, 2.22E1, 9.68E1, 2.54E1, 9.64E1);
        ctx.bezierCurveTo(2.86E1, 9.6E1, 3.82E1, 9.2E1, 4.5E1, 9.6E1);
        ctx.bezierCurveTo(5.18E1, 1E2, 5.98E1, 1.044E2, 5.98E1, 1.044E2);
        ctx.bezierCurveTo(5.98E1, 1.044E2, 4.34E1, 9.6E1, 3.98E1, 9.84E1);
        ctx.bezierCurveTo(3.62E1, 1.008E2, 2.9E1, 1.004E2, 2.3E1, 1.036E2);
        ctx.bezierCurveTo(2.3E1, 1.036E2, 8.2E0, 1.08001E2, 5E0, 1.10001E2);
        ctx.bezierCurveTo(1.8E0, 1.12001E2, (-8.6E0), 1.23601E2, (-1.02E1), 1.22801E2);
        ctx.bezierCurveTo((-1.18E1), 1.22001E2, (-9.8E0), 1.21601E2, (-8.6E0), 1.18801E2);
        ctx.bezierCurveTo((-7.4E0), 1.16001E2, (-9.4E0), 1.14401E2, (-1.74E1), 1.20801E2);
        ctx.bezierCurveTo((-2.54E1), 1.27201E2, (-2.66E1), 1.29201E2, (-2.66E1), 1.29201E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.9195E1), 1.23234E2);
        ctx.bezierCurveTo((-1.9195E1), 1.23234E2, (-1.7785E1), 1.10194E2, (-9.307E0), 1.11859E2);
        ctx.bezierCurveTo((-9.307E0), 1.11859E2, (-1.081E0), 1.07689E2, 1.641E0, 1.05721E2);
        ctx.bezierCurveTo(1.641E0, 1.05721E2, 9.78E0, 1.04019E2, 1.109E1, 1.03402E2);
        ctx.bezierCurveTo(2.9569E1, 9.4702E1, 4.4288E1, 9.9221E1, 4.4835E1, 9.8101E1);
        ctx.bezierCurveTo(4.5381E1, 9.6982E1, 6.5006E1, 1.04099E2, 6.8615E1, 1.08185E2);
        ctx.bezierCurveTo(6.9006E1, 1.08628E2, 5.8384E1, 1.02588E2, 4.8686E1, 1.00697E2);
        ctx.bezierCurveTo(4.0413E1, 9.9083E1, 1.8811E1, 1.00944E2, 7.905E0, 1.0648E2);
        ctx.bezierCurveTo(4.932E0, 1.07989E2, (-4.013E0), 1.13773E2, (-6.544E0), 1.13662E2);
        ctx.bezierCurveTo((-9.075E0), 1.1355E2, (-1.9195E1), 1.23234E2, (-1.9195E1), 1.23234E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-2.3E1), 1.48801E2);
        ctx.bezierCurveTo((-2.3E1), 1.48801E2, (-3.82E1), 1.46401E2, (-2.14E1), 1.44801E2);
        ctx.bezierCurveTo((-2.14E1), 1.44801E2, (-3.4E0), 1.42801E2, 6E-1, 1.37601E2);
        ctx.bezierCurveTo(6E-1, 1.37601E2, 1.42E1, 1.28401E2, 1.7E1, 1.28001E2);
        ctx.bezierCurveTo(1.98E1, 1.27601E2, 4.98E1, 1.20401E2, 5.02E1, 1.18001E2);
        ctx.bezierCurveTo(5.06E1, 1.15601E2, 5.62E1, 1.15601E2, 5.78E1, 1.16401E2);
        ctx.bezierCurveTo(5.94E1, 1.17201E2, 5.86E1, 1.18401E2, 5.58E1, 1.19201E2);
        ctx.bezierCurveTo(5.3E1, 1.20001E2, 2.18E1, 1.36401E2, 1.54E1, 1.37601E2);
        ctx.bezierCurveTo(9E0, 1.38801E2, (-2.6E0), 1.46401E2, (-7.4E0), 1.47601E2);
        ctx.bezierCurveTo((-1.22E1), 1.48801E2, (-2.3E1), 1.48801E2, (-2.3E1), 1.48801E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-3.48E0), 1.41403E2);
        ctx.bezierCurveTo((-3.48E0), 1.41403E2, (-1.2062E1), 1.40574E2, (-3.461E0), 1.39755E2);
        ctx.bezierCurveTo((-3.461E0), 1.39755E2, 5.355E0, 1.36331E2, 7.403E0, 1.33668E2);
        ctx.bezierCurveTo(7.403E0, 1.33668E2, 1.4367E1, 1.28957E2, 1.58E1, 1.28753E2);
        ctx.bezierCurveTo(1.7234E1, 1.28548E2, 3.1194E1, 1.24861E2, 3.1399E1, 1.23633E2);
        ctx.bezierCurveTo(3.1604E1, 1.22404E2, 6.567E1, 1.09823E2, 7.009E1, 1.13013E2);
        ctx.bezierCurveTo(7.3001E1, 1.15114E2, 6.31E1, 1.13437E2, 5.3466E1, 1.17847E2);
        ctx.bezierCurveTo(5.2111E1, 1.18467E2, 1.8258E1, 1.33054E2, 1.4981E1, 1.33668E2);
        ctx.bezierCurveTo(1.1704E1, 1.34283E2, 5.765E0, 1.38174E2, 3.307E0, 1.38788E2);
        ctx.bezierCurveTo(8.5E-1, 1.39403E2, (-3.48E0), 1.41403E2, (-3.48E0), 1.41403E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.14E1), 1.43601E2);
        ctx.bezierCurveTo((-1.14E1), 1.43601E2, (-6.2E0), 1.43201E2, (-7.4E0), 1.44801E2);
        ctx.bezierCurveTo((-8.6E0), 1.46401E2, (-1.1E1), 1.45601E2, (-1.1E1), 1.45601E2);
        ctx.lineTo((-1.14E1), 1.43601E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.86E1), 1.45201E2);
        ctx.bezierCurveTo((-1.86E1), 1.45201E2, (-1.34E1), 1.44801E2, (-1.46E1), 1.46401E2);
        ctx.bezierCurveTo((-1.58E1), 1.48001E2, (-1.82E1), 1.47201E2, (-1.82E1), 1.47201E2);
        ctx.lineTo((-1.86E1), 1.45201E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-2.9E1), 1.46801E2);
        ctx.bezierCurveTo((-2.9E1), 1.46801E2, (-2.38E1), 1.46401E2, (-2.5E1), 1.48001E2);
        ctx.bezierCurveTo((-2.62E1), 1.49601E2, (-2.86E1), 1.48801E2, (-2.86E1), 1.48801E2);
        ctx.lineTo((-2.9E1), 1.46801E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-3.66E1), 1.47601E2);
        ctx.bezierCurveTo((-3.66E1), 1.47601E2, (-3.14E1), 1.47201E2, (-3.26E1), 1.48801E2);
        ctx.bezierCurveTo((-3.38E1), 1.50401E2, (-3.62E1), 1.49601E2, (-3.62E1), 1.49601E2);
        ctx.lineTo((-3.66E1), 1.47601E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(1.8E0, 1.08001E2);
        ctx.bezierCurveTo(1.8E0, 1.08001E2, 6.2E0, 1.08001E2, 5E0, 1.09601E2);
        ctx.bezierCurveTo(3.8E0, 1.11201E2, 6E-1, 1.10801E2, 6E-1, 1.10801E2);
        ctx.lineTo(1.8E0, 1.08001E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-8.2E0), 1.13601E2);
        ctx.bezierCurveTo((-8.2E0), 1.13601E2, (-1.694E0), 1.1146E2, (-4.2E0), 1.14801E2);
        ctx.bezierCurveTo((-5.4E0), 1.16401E2, (-7.8E0), 1.15601E2, (-7.8E0), 1.15601E2);
        ctx.lineTo((-8.2E0), 1.13601E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.94E1), 1.18401E2);
        ctx.bezierCurveTo((-1.94E1), 1.18401E2, (-1.42E1), 1.18001E2, (-1.54E1), 1.19601E2);
        ctx.bezierCurveTo((-1.66E1), 1.21201E2, (-1.9E1), 1.20401E2, (-1.9E1), 1.20401E2);
        ctx.lineTo((-1.94E1), 1.18401E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-2.7E1), 1.24401E2);
        ctx.bezierCurveTo((-2.7E1), 1.24401E2, (-2.18E1), 1.24001E2, (-2.3E1), 1.25601E2);
        ctx.bezierCurveTo((-2.42E1), 1.27201E2, (-2.66E1), 1.26401E2, (-2.66E1), 1.26401E2);
        ctx.lineTo((-2.7E1), 1.24401E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-3.38E1), 1.29201E2);
        ctx.bezierCurveTo((-3.38E1), 1.29201E2, (-2.86E1), 1.28801E2, (-2.98E1), 1.30401E2);
        ctx.bezierCurveTo((-3.1E1), 1.32001E2, (-3.34E1), 1.31201E2, (-3.34E1), 1.31201E2);
        ctx.lineTo((-3.38E1), 1.29201E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(5.282E0, 1.35598E2);
        ctx.bezierCurveTo(5.282E0, 1.35598E2, 1.2203E1, 1.35066E2, 1.0606E1, 1.37195E2);
        ctx.bezierCurveTo(9.009E0, 1.39325E2, 5.814E0, 1.3826E2, 5.814E0, 1.3826E2);
        ctx.lineTo(5.282E0, 1.35598E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(1.5682E1, 1.30798E2);
        ctx.bezierCurveTo(1.5682E1, 1.30798E2, 2.2603E1, 1.30266E2, 2.1006E1, 1.32395E2);
        ctx.bezierCurveTo(1.9409E1, 1.34525E2, 1.6214E1, 1.3346E2, 1.6214E1, 1.3346E2);
        ctx.lineTo(1.5682E1, 1.30798E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(2.6482E1, 1.26398E2);
        ctx.bezierCurveTo(2.6482E1, 1.26398E2, 3.3403E1, 1.25866E2, 3.1806E1, 1.27995E2);
        ctx.bezierCurveTo(3.0209E1, 1.30125E2, 2.7014E1, 1.2906E2, 2.7014E1, 1.2906E2);
        ctx.lineTo(2.6482E1, 1.26398E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(3.6882E1, 1.21598E2);
        ctx.bezierCurveTo(3.6882E1, 1.21598E2, 4.3803E1, 1.21066E2, 4.2206E1, 1.23195E2);
        ctx.bezierCurveTo(4.0609E1, 1.25325E2, 3.7414E1, 1.2426E2, 3.7414E1, 1.2426E2);
        ctx.lineTo(3.6882E1, 1.21598E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(9.282E0, 1.03598E2);
        ctx.bezierCurveTo(9.282E0, 1.03598E2, 1.6203E1, 1.03066E2, 1.4606E1, 1.05195E2);
        ctx.bezierCurveTo(1.3009E1, 1.07325E2, 9.014E0, 1.0706E2, 9.014E0, 1.0706E2);
        ctx.lineTo(9.282E0, 1.03598E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(1.9282E1, 1.00398E2);
        ctx.bezierCurveTo(1.9282E1, 1.00398E2, 2.6203E1, 9.9866E1, 2.4606E1, 1.01995E2);
        ctx.bezierCurveTo(2.3009E1, 1.04125E2, 1.8614E1, 1.0386E2, 1.8614E1, 1.0386E2);
        ctx.lineTo(1.9282E1, 1.00398E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-3.4E0), 1.40401E2);
        ctx.bezierCurveTo((-3.4E0), 1.40401E2, 1.8E0, 1.40001E2, 6E-1, 1.41601E2);
        ctx.bezierCurveTo((-6E-1), 1.43201E2, (-3E0), 1.42401E2, (-3E0), 1.42401E2);
        ctx.lineTo((-3.4E0), 1.40401E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#992600';
        ctx.fillStyle = 'rgba(153,38,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#992600';
        ctx.fillStyle = 'rgba(153,38,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-7.66E1), 4.12E1);
        ctx.bezierCurveTo((-7.66E1), 4.12E1, (-8.1E1), 5E1, (-8.14E1), 5.32E1);
        ctx.bezierCurveTo((-8.14E1), 5.32E1, (-8.06E1), 4.44E1, (-7.94E1), 4.24E1);
        ctx.bezierCurveTo((-7.82E1), 4.04E1, (-7.66E1), 4.12E1, (-7.66E1), 4.12E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#992600';
        ctx.fillStyle = 'rgba(153,38,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#992600';
        ctx.fillStyle = 'rgba(153,38,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-9.5E1), 5.52E1);
        ctx.bezierCurveTo((-9.5E1), 5.52E1, (-9.82E1), 6.96E1, (-9.78E1), 7.24E1);
        ctx.bezierCurveTo((-9.78E1), 7.24E1, (-9.9E1), 6.08E1, (-9.86E1), 5.96E1);
        ctx.bezierCurveTo((-9.82E1), 5.84E1, (-9.5E1), 5.52E1, (-9.5E1), 5.52E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-7.42E1), (-1.94E1));
        ctx.lineTo((-7.44E1), (-1.62E1));
        ctx.lineTo((-7.66E1), (-1.6E1));
        ctx.bezierCurveTo((-7.66E1), (-1.6E1), (-6.24E1), (-3.4E0), (-6.18E1), 4.2E0);
        ctx.bezierCurveTo((-6.18E1), 4.2E0, (-6.1E1), (-4E0), (-7.42E1), (-1.94E1));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-7.0216E1), (-1.8135E1));
        ctx.bezierCurveTo((-7.0647E1), (-1.8551E1), (-7.0428E1), (-1.9296E1), (-7.0836E1), (-1.9556E1));
        ctx.bezierCurveTo((-7.1645E1), (-2.0072E1), (-6.9538E1), (-2.0129E1), (-6.9766E1), (-2.0845E1));
        ctx.bezierCurveTo((-7.0149E1), (-2.2051E1), (-6.9962E1), (-2.2072E1), (-7.0084E1), (-2.3348E1));
        ctx.bezierCurveTo((-7.0141E1), (-2.3946E1), (-6.9553E1), (-2.5486E1), (-6.9168E1), (-2.5926E1));
        ctx.bezierCurveTo((-6.7722E1), (-2.7578E1), (-6.9046E1), (-3.051E1), (-6.7406E1), (-3.2061E1));
        ctx.bezierCurveTo((-6.7102E1), (-3.235E1), (-6.6726E1), (-3.2902E1), (-6.6441E1), (-3.332E1));
        ctx.bezierCurveTo((-6.5782E1), (-3.4283E1), (-6.4598E1), (-3.4771E1), (-6.3648E1), (-3.5599E1));
        ctx.bezierCurveTo((-6.333E1), (-3.5875E1), (-6.3531E1), (-3.6702E1), (-6.2962E1), (-3.661E1));
        ctx.bezierCurveTo((-6.2248E1), (-3.6495E1), (-6.1007E1), (-3.6625E1), (-6.1052E1), (-3.5784E1));
        ctx.bezierCurveTo((-6.1165E1), (-3.3664E1), (-6.2494E1), (-3.1944E1), (-6.3774E1), (-3.0276E1));
        ctx.bezierCurveTo((-6.3323E1), (-2.9572E1), (-6.3781E1), (-2.8937E1), (-6.4065E1), (-2.838E1));
        ctx.bezierCurveTo((-6.54E1), (-2.576E1), (-6.5211E1), (-2.2919E1), (-6.5385E1), (-2.0079E1));
        ctx.bezierCurveTo((-6.539E1), (-1.9994E1), (-6.5697E1), (-1.9916E1), (-6.5689E1), (-1.9863E1));
        ctx.bezierCurveTo((-6.5336E1), (-1.7528E1), (-6.4752E1), (-1.5329E1), (-6.3873E1), (-1.31E1));
        ctx.bezierCurveTo((-6.3507E1), (-1.217E1), (-6.3036E1), (-1.1275E1), (-6.2886E1), (-1.0348E1));
        ctx.bezierCurveTo((-6.2775E1), (-9.662E0), (-6.2672E1), (-8.829E0), (-6.308E1), (-8.124E0));
        ctx.bezierCurveTo((-6.1045E1), (-5.234E0), (-6.2354E1), (-2.583E0), (-6.1185E1), 9.48E-1);
        ctx.bezierCurveTo((-6.0978E1), 1.573E0, (-5.9286E1), 3.487E0, (-5.9749E1), 3.326E0);
        ctx.bezierCurveTo((-6.2262E1), 2.455E0, (-6.2374E1), 2.057E0, (-6.2551E1), 1.304E0);
        ctx.bezierCurveTo((-6.2697E1), 6.81E-1, (-6.3027E1), (-6.96E-1), (-6.3264E1), (-1.298E0));
        ctx.bezierCurveTo((-6.3328E1), (-1.462E0), (-6.3499E1), (-3.346E0), (-6.3577E1), (-3.468E0));
        ctx.bezierCurveTo((-6.509E1), (-5.85E0), (-6.3732E1), (-5.674E0), (-6.5102E1), (-8.032E0));
        ctx.bezierCurveTo((-6.653E1), (-8.712E0), (-6.7496E1), (-9.816E0), (-6.8619E1), (-1.0978E1));
        ctx.bezierCurveTo((-6.8817E1), (-1.1182E1), (-6.7674E1), (-1.1906E1), (-6.7855E1), (-1.2119E1));
        ctx.bezierCurveTo((-6.8947E1), (-1.3408E1), (-7.01E1), (-1.4175E1), (-6.9764E1), (-1.5668E1));
        ctx.bezierCurveTo((-6.9609E1), (-1.6358E1), (-6.9472E1), (-1.7415E1), (-7.0216E1), (-1.8135E1));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-7.38E1), (-1.64E1));
        ctx.bezierCurveTo((-7.38E1), (-1.64E1), (-7.34E1), (-9.6E0), (-7.1E1), (-8E0));
        ctx.bezierCurveTo((-6.86E1), (-6.4E0), (-6.98E1), (-7.2E0), (-7.3E1), (-8.4E0));
        ctx.bezierCurveTo((-7.62E1), (-9.6E0), (-7.5E1), (-1.04E1), (-7.5E1), (-1.04E1));
        ctx.bezierCurveTo((-7.5E1), (-1.04E1), (-7.78E1), (-1E1), (-7.54E1), (-8E0));
        ctx.bezierCurveTo((-7.3E1), (-6E0), (-6.94E1), (-3.6E0), (-7.1E1), (-3.6E0));
        ctx.bezierCurveTo((-7.26E1), (-3.6E0), (-8.02E1), (-7.6E0), (-8.02E1), (-1.04E1));
        ctx.bezierCurveTo((-8.02E1), (-1.32E1), (-8.12E1), (-1.73E1), (-8.12E1), (-1.73E1));
        ctx.bezierCurveTo((-8.12E1), (-1.73E1), (-8.01E1), (-1.81E1), (-7.53E1), (-1.8E1));
        ctx.bezierCurveTo((-7.53E1), (-1.8E1), (-7.39E1), (-1.73E1), (-7.38E1), (-1.64E1));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-7.46E1), 2.2E0);
        ctx.bezierCurveTo((-7.46E1), 2.2E0, (-8.312E1), (-5.91E-1), (-1.016E2), 2.8E0);
        ctx.bezierCurveTo((-1.016E2), 2.8E0, (-9.2569E1), 7.22E-1, (-7.38E1), 3E0);
        ctx.bezierCurveTo((-6.35E1), 4.25E0, (-7.46E1), 2.2E0, (-7.46E1), 2.2E0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-7.2502E1), 2.129E0);
        ctx.bezierCurveTo((-7.2502E1), 2.129E0, (-8.0748E1), (-1.389E0), (-9.9453E1), 3.92E-1);
        ctx.bezierCurveTo((-9.9453E1), 3.92E-1, (-9.0275E1), (-8.97E-1), (-7.1774E1), 2.995E0);
        ctx.bezierCurveTo((-6.162E1), 5.131E0, (-7.2502E1), 2.129E0, (-7.2502E1), 2.129E0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-7.0714E1), 2.222E0);
        ctx.bezierCurveTo((-7.0714E1), 2.222E0, (-7.8676E1), (-1.899E0), (-9.7461E1), (-1.514E0));
        ctx.bezierCurveTo((-9.7461E1), (-1.514E0), (-8.8213E1), (-2.118E0), (-7.0052E1), 3.14E0);
        ctx.bezierCurveTo((-6.0086E1), 6.025E0, (-7.0714E1), 2.222E0, (-7.0714E1), 2.222E0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-6.9444E1), 2.445E0);
        ctx.bezierCurveTo((-6.9444E1), 2.445E0, (-7.6268E1), (-1.862E0), (-9.3142E1), (-2.96E0));
        ctx.bezierCurveTo((-9.3142E1), (-2.96E0), (-8.4803E1), (-2.79E0), (-6.8922E1), 3.319E0);
        ctx.bezierCurveTo((-6.0206E1), 6.672E0, (-6.9444E1), 2.445E0, (-6.9444E1), 2.445E0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(4.584E1, 1.2961E1);
        ctx.bezierCurveTo(4.584E1, 1.2961E1, 4.491E1, 1.3605E1, 4.5124E1, 1.2424E1);
        ctx.bezierCurveTo(4.5339E1, 1.1243E1, 7.3547E1, (-1.927E0), 7.7161E1, (-1.677E0));
        ctx.bezierCurveTo(7.7161E1, (-1.677E0), 4.6913E1, 1.1529E1, 4.584E1, 1.2961E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(4.2446E1, 1.36E1);
        ctx.bezierCurveTo(4.2446E1, 1.36E1, 4.157E1, 1.4315E1, 4.1691E1, 1.3121E1);
        ctx.bezierCurveTo(4.1812E1, 1.1927E1, 6.8899E1, (-3.418E0), 7.2521E1, (-3.452E0));
        ctx.bezierCurveTo(7.2521E1, (-3.452E0), 4.3404E1, 1.2089E1, 4.2446E1, 1.36E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(3.916E1, 1.4975E1);
        ctx.bezierCurveTo(3.916E1, 1.4975E1, 3.8332E1, 1.5747E1, 3.8374E1, 1.4547E1);
        ctx.bezierCurveTo(3.8416E1, 1.3348E1, 5.8233E1, (-2.149E0), 6.8045E1, (-4.023E0));
        ctx.bezierCurveTo(6.8045E1, (-4.023E0), 5.0015E1, 4.104E0, 3.916E1, 1.4975E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(3.6284E1, 1.6838E1);
        ctx.bezierCurveTo(3.6284E1, 1.6838E1, 3.5539E1, 1.7532E1, 3.5577E1, 1.6453E1);
        ctx.bezierCurveTo(3.5615E1, 1.5373E1, 5.3449E1, 1.426E0, 6.228E1, (-2.6E-1));
        ctx.bezierCurveTo(6.228E1, (-2.6E-1), 4.6054E1, 7.054E0, 3.6284E1, 1.6838E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(4.6E0, 1.64801E2);
        ctx.bezierCurveTo(4.6E0, 1.64801E2, (-1.06E1), 1.62401E2, 6.2E0, 1.60801E2);
        ctx.bezierCurveTo(6.2E0, 1.60801E2, 2.42E1, 1.58801E2, 2.82E1, 1.53601E2);
        ctx.bezierCurveTo(2.82E1, 1.53601E2, 4.18E1, 1.44401E2, 4.46E1, 1.44001E2);
        ctx.bezierCurveTo(4.74E1, 1.43601E2, 6.38E1, 1.40001E2, 6.42E1, 1.37601E2);
        ctx.bezierCurveTo(6.46E1, 1.35201E2, 7.06E1, 1.32801E2, 7.22E1, 1.33601E2);
        ctx.bezierCurveTo(7.38E1, 1.34401E2, 7.38E1, 1.43601E2, 7.1E1, 1.44401E2);
        ctx.bezierCurveTo(6.82E1, 1.45201E2, 4.94E1, 1.52401E2, 4.3E1, 1.53601E2);
        ctx.bezierCurveTo(3.66E1, 1.54801E2, 2.5E1, 1.62401E2, 2.02E1, 1.63601E2);
        ctx.bezierCurveTo(1.54E1, 1.64801E2, 4.6E0, 1.64801E2, 4.6E0, 1.64801E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(7.76E1, 1.27401E2);
        ctx.bezierCurveTo(7.76E1, 1.27401E2, 7.46E1, 1.29001E2, 7.34E1, 1.31601E2);
        ctx.bezierCurveTo(7.34E1, 1.31601E2, 6.7E1, 1.42201E2, 5.28E1, 1.45401E2);
        ctx.bezierCurveTo(5.28E1, 1.45401E2, 2.98E1, 1.54401E2, 2.2E1, 1.56401E2);
        ctx.bezierCurveTo(2.2E1, 1.56401E2, 8.6E0, 1.61401E2, 1.2E0, 1.60601E2);
        ctx.bezierCurveTo(1.2E0, 1.60601E2, (-5.8E0), 1.60801E2, 4E-1, 1.62401E2);
        ctx.bezierCurveTo(4E-1, 1.62401E2, 2.06E1, 1.60401E2, 2.4E1, 1.58601E2);
        ctx.bezierCurveTo(2.4E1, 1.58601E2, 3.96E1, 1.53401E2, 4.26E1, 1.50801E2);
        ctx.bezierCurveTo(4.56E1, 1.48201E2, 6.38E1, 1.43201E2, 6.6E1, 1.41201E2);
        ctx.bezierCurveTo(6.82E1, 1.39201E2, 7.8E1, 1.30801E2, 7.76E1, 1.27401E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(1.8882E1, 1.58911E2);
        ctx.bezierCurveTo(1.8882E1, 1.58911E2, 2.4111E1, 1.58685E2, 2.2958E1, 1.60234E2);
        ctx.bezierCurveTo(2.1805E1, 1.61784E2, 1.9357E1, 1.6091E2, 1.9357E1, 1.6091E2);
        ctx.lineTo(1.8882E1, 1.58911E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(1.168E1, 1.60263E2);
        ctx.bezierCurveTo(1.168E1, 1.60263E2, 1.6908E1, 1.60037E2, 1.5756E1, 1.61586E2);
        ctx.bezierCurveTo(1.4603E1, 1.63136E2, 1.2155E1, 1.62263E2, 1.2155E1, 1.62263E2);
        ctx.lineTo(1.168E1, 1.60263E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(1.251E0, 1.61511E2);
        ctx.bezierCurveTo(1.251E0, 1.61511E2, 6.48E0, 1.61284E2, 5.327E0, 1.62834E2);
        ctx.bezierCurveTo(4.174E0, 1.64383E2, 1.726E0, 1.6351E2, 1.726E0, 1.6351E2);
        ctx.lineTo(1.251E0, 1.61511E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-6.383E0), 1.62055E2);
        ctx.bezierCurveTo((-6.383E0), 1.62055E2, (-1.154E0), 1.61829E2, (-2.307E0), 1.63378E2);
        ctx.bezierCurveTo((-3.46E0), 1.64928E2, (-5.908E0), 1.64054E2, (-5.908E0), 1.64054E2);
        ctx.lineTo((-6.383E0), 1.62055E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(3.5415E1, 1.51513E2);
        ctx.bezierCurveTo(3.5415E1, 1.51513E2, 4.2375E1, 1.51212E2, 4.084E1, 1.53274E2);
        ctx.bezierCurveTo(3.9306E1, 1.55336E2, 3.6047E1, 1.54174E2, 3.6047E1, 1.54174E2);
        ctx.lineTo(3.5415E1, 1.51513E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(4.573E1, 1.47088E2);
        ctx.bezierCurveTo(4.573E1, 1.47088E2, 5.1689E1, 1.43787E2, 5.1155E1, 1.48849E2);
        ctx.bezierCurveTo(5.0885E1, 1.51405E2, 4.6362E1, 1.49749E2, 4.6362E1, 1.49749E2);
        ctx.lineTo(4.573E1, 1.47088E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(5.4862E1, 1.44274E2);
        ctx.bezierCurveTo(5.4862E1, 1.44274E2, 6.2021E1, 1.40573E2, 6.0287E1, 1.46035E2);
        ctx.bezierCurveTo(5.9509E1, 1.48485E2, 5.5493E1, 1.46935E2, 5.5493E1, 1.46935E2);
        ctx.lineTo(5.4862E1, 1.44274E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(6.4376E1, 1.39449E2);
        ctx.bezierCurveTo(6.4376E1, 1.39449E2, 6.8735E1, 1.34548E2, 6.9801E1, 1.4121E2);
        ctx.bezierCurveTo(7.0207E1, 1.43748E2, 6.5008E1, 1.4211E2, 6.5008E1, 1.4211E2);
        ctx.lineTo(6.4376E1, 1.39449E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(2.6834E1, 1.55997E2);
        ctx.bezierCurveTo(2.6834E1, 1.55997E2, 3.2062E1, 1.5577E2, 3.091E1, 1.5732E2);
        ctx.bezierCurveTo(2.9757E1, 1.58869E2, 2.7308E1, 1.57996E2, 2.7308E1, 1.57996E2);
        ctx.lineTo(2.6834E1, 1.55997E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(6.2434E1, 3.4603E1);
        ctx.bezierCurveTo(6.2434E1, 3.4603E1, 6.1708E1, 3.5268E1, 6.1707E1, 3.4197E1);
        ctx.bezierCurveTo(6.1707E1, 3.3127E1, 7.9191E1, 1.9863E1, 8.8034E1, 1.8479E1);
        ctx.bezierCurveTo(8.8034E1, 1.8479E1, 7.1935E1, 2.5208E1, 6.2434E1, 3.4603E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(6.54E1, 9.84E1);
        ctx.bezierCurveTo(6.54E1, 9.84E1, 8.7401E1, 1.20801E2, 9.6601E1, 1.24401E2);
        ctx.bezierCurveTo(9.6601E1, 1.24401E2, 1.05801E2, 1.35601E2, 1.01801E2, 1.61601E2);
        ctx.bezierCurveTo(1.01801E2, 1.61601E2, 9.8601E1, 1.69201E2, 9.5401E1, 1.48401E2);
        ctx.bezierCurveTo(9.5401E1, 1.48401E2, 9.8601E1, 1.23201E2, 8.7401E1, 1.39201E2);
        ctx.bezierCurveTo(8.7401E1, 1.39201E2, 7.9E1, 1.29301E2, 8.54E1, 1.29601E2);
        ctx.bezierCurveTo(8.54E1, 1.29601E2, 8.8601E1, 1.31601E2, 8.9001E1, 1.30001E2);
        ctx.bezierCurveTo(8.9401E1, 1.28401E2, 8.14E1, 1.14801E2, 6.42E1, 1.004E2);
        ctx.bezierCurveTo(4.7E1, 8.6E1, 6.54E1, 9.84E1, 6.54E1, 9.84E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(7E0, 1.37201E2);
        ctx.bezierCurveTo(7E0, 1.37201E2, 6.8E0, 1.35401E2, 8.6E0, 1.36201E2);
        ctx.bezierCurveTo(1.04E1, 1.37001E2, 1.04601E2, 1.43201E2, 1.36201E2, 1.67201E2);
        ctx.bezierCurveTo(1.36201E2, 1.67201E2, 9.1001E1, 1.44001E2, 7E0, 1.37201E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(1.74E1, 1.32801E2);
        ctx.bezierCurveTo(1.74E1, 1.32801E2, 1.72E1, 1.31001E2, 1.9E1, 1.31801E2);
        ctx.bezierCurveTo(2.08E1, 1.32601E2, 1.57401E2, 1.31601E2, 1.81001E2, 1.64001E2);
        ctx.bezierCurveTo(1.81001E2, 1.64001E2, 1.59001E2, 1.38801E2, 1.74E1, 1.32801E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(2.9E1, 1.28801E2);
        ctx.bezierCurveTo(2.9E1, 1.28801E2, 2.88E1, 1.27001E2, 3.06E1, 1.27801E2);
        ctx.bezierCurveTo(3.24E1, 1.28601E2, 2.05801E2, 1.15601E2, 2.29401E2, 1.48001E2);
        ctx.bezierCurveTo(2.29401E2, 1.48001E2, 2.19801E2, 1.22401E2, 2.9E1, 1.28801E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(3.9E1, 1.24001E2);
        ctx.bezierCurveTo(3.9E1, 1.24001E2, 3.88E1, 1.22201E2, 4.06E1, 1.23001E2);
        ctx.bezierCurveTo(4.24E1, 1.23801E2, 1.64601E2, 8.52E1, 1.88201E2, 1.17601E2);
        ctx.bezierCurveTo(1.88201E2, 1.17601E2, 1.74801E2, 9.3E1, 3.9E1, 1.24001E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.9E1), 1.46801E2);
        ctx.bezierCurveTo((-1.9E1), 1.46801E2, (-1.92E1), 1.45001E2, (-1.74E1), 1.45801E2);
        ctx.bezierCurveTo((-1.56E1), 1.46601E2, 2.2E0, 1.48801E2, 4.2E0, 1.87601E2);
        ctx.bezierCurveTo(4.2E0, 1.87601E2, (-3E0), 1.45601E2, (-1.9E1), 1.46801E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-2.78E1), 1.48401E2);
        ctx.bezierCurveTo((-2.78E1), 1.48401E2, (-2.8E1), 1.46601E2, (-2.62E1), 1.47401E2);
        ctx.bezierCurveTo((-2.44E1), 1.48201E2, (-1.02E1), 1.43601E2, (-1.3E1), 1.82401E2);
        ctx.bezierCurveTo((-1.3E1), 1.82401E2, (-1.18E1), 1.47201E2, (-2.78E1), 1.48401E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-3.58E1), 1.48801E2);
        ctx.bezierCurveTo((-3.58E1), 1.48801E2, (-3.6E1), 1.47001E2, (-3.42E1), 1.47801E2);
        ctx.bezierCurveTo((-3.24E1), 1.48601E2, (-1.7E1), 1.49201E2, (-2.94E1), 1.71601E2);
        ctx.bezierCurveTo((-2.94E1), 1.71601E2, (-1.98E1), 1.47601E2, (-3.58E1), 1.48801E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(1.1526E1, 1.04465E2);
        ctx.bezierCurveTo(1.1526E1, 1.04465E2, 1.1082E1, 1.06464E2, 1.2631E1, 1.05247E2);
        ctx.bezierCurveTo(2.8699E1, 9.2622E1, 6.1141E1, 3.372E1, 1.16826E2, 2.8086E1);
        ctx.bezierCurveTo(1.16826E2, 2.8086E1, 7.8518E1, 1.5976E1, 1.1526E1, 1.04465E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(2.2726E1, 1.02665E2);
        ctx.bezierCurveTo(2.2726E1, 1.02665E2, 2.1363E1, 1.01472E2, 2.3231E1, 1.00847E2);
        ctx.bezierCurveTo(2.5099E1, 1.00222E2, 1.37541E2, 2.772E1, 1.76826E2, 3.5686E1);
        ctx.bezierCurveTo(1.76826E2, 3.5686E1, 1.49719E2, 2.8176E1, 2.2726E1, 1.02665E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(1.885E0, 1.08767E2);
        ctx.bezierCurveTo(1.885E0, 1.08767E2, 1.376E0, 1.10366E2, 3.087E0, 1.0939E2);
        ctx.bezierCurveTo(1.2062E1, 1.0427E2, 1.5677E1, 4.7059E1, 5.9254E1, 4.5804E1);
        ctx.bezierCurveTo(5.9254E1, 4.5804E1, 2.6843E1, 3.109E1, 1.885E0, 1.08767E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.8038E1), 1.19793E2);
        ctx.bezierCurveTo((-1.8038E1), 1.19793E2, (-1.9115E1), 1.21079E2, (-1.7162E1), 1.20825E2);
        ctx.bezierCurveTo((-6.916E0), 1.19493E2, 1.4489E1, 7.8222E1, 5.8928E1, 8.3301E1);
        ctx.bezierCurveTo(5.8928E1, 8.3301E1, 2.6962E1, 6.8955E1, (-1.8038E1), 1.19793E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-6.8E0), 1.13667E2);
        ctx.bezierCurveTo((-6.8E0), 1.13667E2, (-7.611E0), 1.15136E2, (-5.742E0), 1.14511E2);
        ctx.bezierCurveTo(4.057E0, 1.11237E2, 1.7141E1, 6.6625E1, 6.1729E1, 6.3078E1);
        ctx.bezierCurveTo(6.1729E1, 6.3078E1, 2.7603E1, 5.5135E1, (-6.8E0), 1.13667E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-2.5078E1), 1.24912E2);
        ctx.bezierCurveTo((-2.5078E1), 1.24912E2, (-2.5951E1), 1.25954E2, (-2.4369E1), 1.25748E2);
        ctx.bezierCurveTo((-1.607E1), 1.24669E2, 1.268E0, 9.124E1, 3.7264E1, 9.5354E1);
        ctx.bezierCurveTo(3.7264E1, 9.5354E1, 1.1371E1, 8.3734E1, (-2.5078E1), 1.24912E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-3.2677E1), 1.30821E2);
        ctx.bezierCurveTo((-3.2677E1), 1.30821E2, (-3.3682E1), 1.31866E2, (-3.2091E1), 1.31748E2);
        ctx.bezierCurveTo((-2.7923E1), 1.31439E2, 2.715E0, 9.836E1, 2.1183E1, 1.13862E2);
        ctx.bezierCurveTo(2.1183E1, 1.13862E2, 9.168E0, 9.5139E1, (-3.2677E1), 1.30821E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(3.6855E1, 9.8898E1);
        ctx.bezierCurveTo(3.6855E1, 9.8898E1, 3.5654E1, 9.7543E1, 3.7586E1, 9.7158E1);
        ctx.bezierCurveTo(3.9518E1, 9.6774E1, 1.60221E2, 3.9061E1, 1.98184E2, 5.1927E1);
        ctx.bezierCurveTo(1.98184E2, 5.1927E1, 1.72243E2, 4.1053E1, 3.6855E1, 9.8898E1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(3.4E0, 1.63201E2);
        ctx.bezierCurveTo(3.4E0, 1.63201E2, 3.2E0, 1.61401E2, 5E0, 1.62201E2);
        ctx.bezierCurveTo(6.8E0, 1.63001E2, 2.22E1, 1.63601E2, 9.8E0, 1.86001E2);
        ctx.bezierCurveTo(9.8E0, 1.86001E2, 1.94E1, 1.62001E2, 3.4E0, 1.63201E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(1.38E1, 1.61601E2);
        ctx.bezierCurveTo(1.38E1, 1.61601E2, 1.36E1, 1.59801E2, 1.54E1, 1.60601E2);
        ctx.bezierCurveTo(1.72E1, 1.61401E2, 3.5E1, 1.63601E2, 3.7E1, 2.02401E2);
        ctx.bezierCurveTo(3.7E1, 2.02401E2, 2.98E1, 1.60401E2, 1.38E1, 1.61601E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(2.06E1, 1.60001E2);
        ctx.bezierCurveTo(2.06E1, 1.60001E2, 2.04E1, 1.58201E2, 2.22E1, 1.59001E2);
        ctx.bezierCurveTo(2.4E1, 1.59801E2, 4.86E1, 1.63201E2, 7.22E1, 1.95601E2);
        ctx.bezierCurveTo(7.22E1, 1.95601E2, 3.66E1, 1.58801E2, 2.06E1, 1.60001E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(2.8225E1, 1.57972E2);
        ctx.bezierCurveTo(2.8225E1, 1.57972E2, 2.7788E1, 1.56214E2, 2.9678E1, 1.56768E2);
        ctx.bezierCurveTo(3.1568E1, 1.57322E2, 5.2002E1, 1.55423E2, 9.0099E1, 1.89599E2);
        ctx.bezierCurveTo(9.0099E1, 1.89599E2, 4.3924E1, 1.54656E2, 2.8225E1, 1.57972E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(3.8625E1, 1.53572E2);
        ctx.bezierCurveTo(3.8625E1, 1.53572E2, 3.8188E1, 1.51814E2, 4.0078E1, 1.52368E2);
        ctx.bezierCurveTo(4.1968E1, 1.52922E2, 7.6802E1, 1.57423E2, 1.28499E2, 1.92399E2);
        ctx.bezierCurveTo(1.28499E2, 1.92399E2, 5.4324E1, 1.50256E2, 3.8625E1, 1.53572E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.8E0), 1.42001E2);
        ctx.bezierCurveTo((-1.8E0), 1.42001E2, (-2E0), 1.40201E2, (-2E-1), 1.41001E2);
        ctx.bezierCurveTo(1.6E0, 1.41801E2, 5.5E1, 1.44401E2, 8.54E1, 1.71201E2);
        ctx.bezierCurveTo(8.54E1, 1.71201E2, 5.0499E1, 1.46426E2, (-1.8E0), 1.42001E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.18E1), 1.46001E2);
        ctx.bezierCurveTo((-1.18E1), 1.46001E2, (-1.2E1), 1.44201E2, (-1.02E1), 1.45001E2);
        ctx.bezierCurveTo((-8.4E0), 1.45801E2, 1.62E1, 1.49201E2, 3.98E1, 1.81601E2);
        ctx.bezierCurveTo(3.98E1, 1.81601E2, 4.2E0, 1.44801E2, (-1.18E1), 1.46001E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(4.9503E1, 1.48962E2);
        ctx.bezierCurveTo(4.9503E1, 1.48962E2, 4.8938E1, 1.47241E2, 5.0864E1, 1.47655E2);
        ctx.bezierCurveTo(5.279E1, 1.48068E2, 8.786E1, 1.50004E2, 1.41981E2, 1.81098E2);
        ctx.bezierCurveTo(1.41981E2, 1.81098E2, 6.4317E1, 1.46704E2, 4.9503E1, 1.48962E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(5.7903E1, 1.46562E2);
        ctx.bezierCurveTo(5.7903E1, 1.46562E2, 5.7338E1, 1.44841E2, 5.9264E1, 1.45255E2);
        ctx.bezierCurveTo(6.119E1, 1.45668E2, 9.626E1, 1.47604E2, 1.50381E2, 1.78698E2);
        ctx.bezierCurveTo(1.50381E2, 1.78698E2, 7.3317E1, 1.43904E2, 5.7903E1, 1.46562E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1E-1;
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(6.7503E1, 1.41562E2);
        ctx.bezierCurveTo(6.7503E1, 1.41562E2, 6.6938E1, 1.39841E2, 6.8864E1, 1.40255E2);
        ctx.bezierCurveTo(7.079E1, 1.40668E2, 1.1386E2, 1.45004E2, 2.03582E2, 1.79298E2);
        ctx.bezierCurveTo(2.03582E2, 1.79298E2, 8.2917E1, 1.38904E2, 6.7503E1, 1.41562E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-4.38E1), 1.48401E2);
        ctx.bezierCurveTo((-4.38E1), 1.48401E2, (-3.86E1), 1.48001E2, (-3.98E1), 1.49601E2);
        ctx.bezierCurveTo((-4.1E1), 1.51201E2, (-4.34E1), 1.50401E2, (-4.34E1), 1.50401E2);
        ctx.lineTo((-4.38E1), 1.48401E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.3E1), 1.62401E2);
        ctx.bezierCurveTo((-1.3E1), 1.62401E2, (-7.8E0), 1.62001E2, (-9E0), 1.63601E2);
        ctx.bezierCurveTo((-1.02E1), 1.65201E2, (-1.26E1), 1.64401E2, (-1.26E1), 1.64401E2);
        ctx.lineTo((-1.3E1), 1.62401E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-2.18E1), 1.62001E2);
        ctx.bezierCurveTo((-2.18E1), 1.62001E2, (-1.66E1), 1.61601E2, (-1.78E1), 1.63201E2);
        ctx.bezierCurveTo((-1.9E1), 1.64801E2, (-2.14E1), 1.64001E2, (-2.14E1), 1.64001E2);
        ctx.lineTo((-2.18E1), 1.62001E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.17169E2), 1.50182E2);
        ctx.bezierCurveTo((-1.17169E2), 1.50182E2, (-1.12124E2), 1.51505E2, (-1.13782E2), 1.52624E2);
        ctx.bezierCurveTo((-1.15439E2), 1.53744E2, (-1.17446E2), 1.52202E2, (-1.17446E2), 1.52202E2);
        ctx.lineTo((-1.17169E2), 1.50182E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.15169E2), 1.40582E2);
        ctx.bezierCurveTo((-1.15169E2), 1.40582E2, (-1.10124E2), 1.41905E2, (-1.11782E2), 1.43024E2);
        ctx.bezierCurveTo((-1.13439E2), 1.44144E2, (-1.15446E2), 1.42602E2, (-1.15446E2), 1.42602E2);
        ctx.lineTo((-1.15169E2), 1.40582E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.22369E2), 1.36182E2);
        ctx.bezierCurveTo((-1.22369E2), 1.36182E2, (-1.17324E2), 1.37505E2, (-1.18982E2), 1.38624E2);
        ctx.bezierCurveTo((-1.20639E2), 1.39744E2, (-1.22646E2), 1.38202E2, (-1.22646E2), 1.38202E2);
        ctx.lineTo((-1.22369E2), 1.36182E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-4.26E1), 2.11201E2);
        ctx.bezierCurveTo((-4.26E1), 2.11201E2, (-4.42E1), 2.11201E2, (-4.82E1), 2.13201E2);
        ctx.bezierCurveTo((-5.02E1), 2.13201E2, (-6.14E1), 2.16801E2, (-6.7E1), 2.26801E2);
        ctx.bezierCurveTo((-6.7E1), 2.26801E2, (-5.46E1), 2.17201E2, (-4.26E1), 2.11201E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(4.5116E1, 3.03847E2);
        ctx.bezierCurveTo(4.5257E1, 3.04105E2, 4.5312E1, 3.04525E2, 4.5604E1, 3.04542E2);
        ctx.bezierCurveTo(4.6262E1, 3.04582E2, 4.7495E1, 3.04883E2, 4.737E1, 3.04247E2);
        ctx.bezierCurveTo(4.6522E1, 2.99941E2, 4.5648E1, 2.95004E2, 4.1515E1, 2.93197E2);
        ctx.bezierCurveTo(4.0876E1, 2.92918E2, 3.9434E1, 2.93331E2, 3.936E1, 2.94215E2);
        ctx.bezierCurveTo(3.9233E1, 2.95739E2, 3.9116E1, 2.97088E2, 3.9425E1, 2.98554E2);
        ctx.bezierCurveTo(3.9725E1, 2.99975E2, 4.1883E1, 2.99985E2, 4.28E1, 2.98601E2);
        ctx.bezierCurveTo(4.3736E1, 3.00273E2, 4.4168E1, 3.02116E2, 4.5116E1, 3.03847E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(3.4038E1, 3.08581E2);
        ctx.bezierCurveTo(3.4786E1, 3.09994E2, 3.4659E1, 3.11853E2, 3.6074E1, 3.12416E2);
        ctx.bezierCurveTo(3.6814E1, 3.1271E2, 3.8664E1, 3.11735E2, 3.8246E1, 3.10661E2);
        ctx.bezierCurveTo(3.7444E1, 3.086E2, 3.7056E1, 3.06361E2, 3.5667E1, 3.0455E2);
        ctx.bezierCurveTo(3.5467E1, 3.04288E2, 3.5707E1, 3.03755E2, 3.5547E1, 3.03427E2);
        ctx.bezierCurveTo(3.4953E1, 3.02207E2, 3.3808E1, 3.01472E2, 3.24E1, 3.01801E2);
        ctx.bezierCurveTo(3.1285E1, 3.04004E2, 3.2433E1, 3.06133E2, 3.3955E1, 3.07842E2);
        ctx.bezierCurveTo(3.4091E1, 3.07994E2, 3.3925E1, 3.0837E2, 3.4038E1, 3.08581E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-5.564E0), 3.03391E2);
        ctx.bezierCurveTo((-5.672E0), 3.03014E2, (-5.71E0), 3.02551E2, (-5.545E0), 3.0223E2);
        ctx.bezierCurveTo((-5.014E0), 3.01197E2, (-4.221E0), 3.00075E2, (-4.558E0), 2.99053E2);
        ctx.bezierCurveTo((-4.906E0), 2.97997E2, (-6.022E0), 2.98179E2, (-6.672E0), 2.98748E2);
        ctx.bezierCurveTo((-7.807E0), 2.99742E2, (-7.856E0), 3.01568E2, (-8.547E0), 3.02927E2);
        ctx.bezierCurveTo((-8.743E0), 3.03313E2, (-8.692E0), 3.03886E2, (-9.133E0), 3.04277E2);
        ctx.bezierCurveTo((-9.607E0), 3.04698E2, (-1.0047E1), 3.06222E2, (-9.951E0), 3.06793E2);
        ctx.bezierCurveTo((-9.898E0), 3.07106E2, (-1.0081E1), 3.17014E2, (-9.859E0), 3.16751E2);
        ctx.bezierCurveTo((-9.24E0), 3.16018E2, (-6.19E0), 3.06284E2, (-6.121E0), 3.05392E2);
        ctx.bezierCurveTo((-6.064E0), 3.04661E2, (-5.332E0), 3.04196E2, (-5.564E0), 3.03391E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-3.1202E1), 2.96599E2);
        ctx.bezierCurveTo((-2.8568E1), 2.941E2, (-2.5778E1), 2.91139E2, (-2.622E1), 2.87427E2);
        ctx.bezierCurveTo((-2.6336E1), 2.86451E2, (-2.8111E1), 2.86978E2, (-2.8298E1), 2.87824E2);
        ctx.bezierCurveTo((-2.91E1), 2.91449E2, (-3.1139E1), 2.9411E2, (-3.3707E1), 2.96502E2);
        ctx.bezierCurveTo((-3.5903E1), 2.98549E2, (-3.7765E1), 3.04893E2, (-3.8E1), 3.05401E2);
        ctx.bezierCurveTo((-3.4303E1), 3.00145E2, (-3.2046E1), 2.97399E2, (-3.1202E1), 2.96599E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-4.4776E1), 2.90635E2);
        ctx.bezierCurveTo((-4.4253E1), 2.90265E2, (-4.4555E1), 2.89774E2, (-4.4338E1), 2.89442E2);
        ctx.bezierCurveTo((-4.3385E1), 2.87984E2, (-4.2084E1), 2.86738E2, (-4.2066E1), 2.85E2);
        ctx.bezierCurveTo((-4.2063E1), 2.84723E2, (-4.2441E1), 2.84414E2, (-4.2776E1), 2.84638E2);
        ctx.bezierCurveTo((-4.3053E1), 2.84822E2, (-4.3395E1), 2.84952E2, (-4.3503E1), 2.85082E2);
        ctx.bezierCurveTo((-4.5533E1), 2.87531E2, (-4.6933E1), 2.90202E2, (-4.8376E1), 2.93014E2);
        ctx.bezierCurveTo((-4.8559E1), 2.93371E2, (-4.9703E1), 2.97862E2, (-4.939E1), 2.97973E2);
        ctx.bezierCurveTo((-4.9151E1), 2.98058E2, (-4.7431E1), 2.93877E2, (-4.7221E1), 2.93763E2);
        ctx.bezierCurveTo((-4.5958E1), 2.93077E2, (-4.5946E1), 2.91462E2, (-4.4776E1), 2.90635E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-2.8043E1), 3.10179E2);
        ctx.bezierCurveTo((-2.7599E1), 3.0931E2, (-2.6023E1), 3.08108E2, (-2.6136E1), 3.07219E2);
        ctx.bezierCurveTo((-2.6254E1), 3.06291E2, (-2.5786E1), 3.04848E2, (-2.6698E1), 3.05536E2);
        ctx.bezierCurveTo((-2.7955E1), 3.06484E2, (-3.1404E1), 3.07833E2, (-3.1674E1), 3.13641E2);
        ctx.bezierCurveTo((-3.17E1), 3.14212E2, (-2.8726E1), 3.11519E2, (-2.8043E1), 3.10179E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.36E1), 2.93001E2);
        ctx.bezierCurveTo((-1.32E1), 2.92333E2, (-1.2492E1), 2.92806E2, (-1.2033E1), 2.92543E2);
        ctx.bezierCurveTo((-1.1385E1), 2.92171E2, (-1.0774E1), 2.91613E2, (-1.0482E1), 2.90964E2);
        ctx.bezierCurveTo((-9.512E0), 2.88815E2, (-7.743E0), 2.86995E2, (-7.6E0), 2.84601E2);
        ctx.bezierCurveTo((-9.091E0), 2.83196E2, (-9.77E0), 2.85236E2, (-1.04E1), 2.86201E2);
        ctx.bezierCurveTo((-1.1723E1), 2.84554E2, (-1.2722E1), 2.86428E2, (-1.4022E1), 2.86947E2);
        ctx.bezierCurveTo((-1.4092E1), 2.86975E2, (-1.4305E1), 2.86628E2, (-1.438E1), 2.86655E2);
        ctx.bezierCurveTo((-1.5557E1), 2.87095E2, (-1.6237E1), 2.88176E2, (-1.7235E1), 2.88957E2);
        ctx.bezierCurveTo((-1.7406E1), 2.89091E2, (-1.7811E1), 2.88911E2, (-1.7958E1), 2.89047E2);
        ctx.bezierCurveTo((-1.861E1), 2.8965E2, (-1.9583E1), 2.89975E2, (-1.9863E1), 2.90657E2);
        ctx.bezierCurveTo((-2.0973E1), 2.93364E2, (-2.4113E1), 2.95459E2, (-2.6E1), 3.03001E2);
        ctx.bezierCurveTo((-2.5619E1), 3.0391E2, (-2.1488E1), 2.96359E2, (-2.1001E1), 2.95661E2);
        ctx.bezierCurveTo((-2.0165E1), 2.94465E2, (-2.0047E1), 2.97322E2, (-1.8771E1), 2.96656E2);
        ctx.bezierCurveTo((-1.872E1), 2.96629E2, (-1.8534E1), 2.96867E2, (-1.84E1), 2.97001E2);
        ctx.bezierCurveTo((-1.8206E1), 2.96721E2, (-1.7988E1), 2.96492E2, (-1.76E1), 2.96601E2);
        ctx.bezierCurveTo((-1.76E1), 2.96201E2, (-1.7734E1), 2.95645E2, (-1.7533E1), 2.95486E2);
        ctx.bezierCurveTo((-1.6296E1), 2.94509E2, (-1.638E1), 2.93441E2, (-1.56E1), 2.92201E2);
        ctx.bezierCurveTo((-1.5142E1), 2.9299E2, (-1.4081E1), 2.92271E2, (-1.36E1), 2.93001E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(4.62E1, 3.47401E2);
        ctx.bezierCurveTo(4.62E1, 3.47401E2, 5.36E1, 3.27001E2, 4.92E1, 3.15801E2);
        ctx.bezierCurveTo(4.92E1, 3.15801E2, 6.06E1, 3.37401E2, 5.6E1, 3.48601E2);
        ctx.bezierCurveTo(5.6E1, 3.48601E2, 5.56E1, 3.38201E2, 5.16E1, 3.33201E2);
        ctx.bezierCurveTo(5.16E1, 3.33201E2, 4.76E1, 3.46001E2, 4.62E1, 3.47401E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(3.14E1, 3.44801E2);
        ctx.bezierCurveTo(3.14E1, 3.44801E2, 3.68E1, 3.36001E2, 2.88E1, 3.17601E2);
        ctx.bezierCurveTo(2.88E1, 3.17601E2, 2.8E1, 3.38001E2, 2.12E1, 3.49001E2);
        ctx.bezierCurveTo(2.12E1, 3.49001E2, 3.54E1, 3.28801E2, 3.14E1, 3.44801E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(2.14E1, 3.42801E2);
        ctx.bezierCurveTo(2.14E1, 3.42801E2, 2.12E1, 3.22801E2, 2.16E1, 3.19801E2);
        ctx.bezierCurveTo(2.16E1, 3.19801E2, 1.78E1, 3.36401E2, 7.6E0, 3.46001E2);
        ctx.bezierCurveTo(7.6E0, 3.46001E2, 2.2E1, 3.34001E2, 2.14E1, 3.42801E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(1.18E1, 3.10801E2);
        ctx.bezierCurveTo(1.18E1, 3.10801E2, 1.78E1, 3.24401E2, 7.8E0, 3.42801E2);
        ctx.bezierCurveTo(7.8E0, 3.42801E2, 1.42E1, 3.30601E2, 9.4E0, 3.23601E2);
        ctx.bezierCurveTo(9.4E0, 3.23601E2, 1.2E1, 3.20201E2, 1.18E1, 3.10801E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-7.4E0), 3.42401E2);
        ctx.bezierCurveTo((-7.4E0), 3.42401E2, (-8.4E0), 3.26801E2, (-6.6E0), 3.24601E2);
        ctx.bezierCurveTo((-6.6E0), 3.24601E2, (-6.4E0), 3.18201E2, (-6.8E0), 3.17201E2);
        ctx.bezierCurveTo((-6.8E0), 3.17201E2, (-2.8E0), 3.11001E2, (-2.6E0), 3.18401E2);
        ctx.bezierCurveTo((-2.6E0), 3.18401E2, (-1.2E0), 3.26201E2, 1.6E0, 3.30801E2);
        ctx.bezierCurveTo(1.6E0, 3.30801E2, 5.2E0, 3.36201E2, 5E0, 3.42601E2);
        ctx.bezierCurveTo(5E0, 3.42601E2, (-5E0), 3.12401E2, (-7.4E0), 3.42401E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-1.1E1), 3.14801E2);
        ctx.bezierCurveTo((-1.1E1), 3.14801E2, (-1.76E1), 3.25601E2, (-1.94E1), 3.44601E2);
        ctx.bezierCurveTo((-1.94E1), 3.44601E2, (-2.08E1), 3.38401E2, (-1.7E1), 3.24001E2);
        ctx.bezierCurveTo((-1.7E1), 3.24001E2, (-1.28E1), 3.08601E2, (-1.1E1), 3.14801E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-3.28E1), 3.34601E2);
        ctx.bezierCurveTo((-3.28E1), 3.34601E2, (-2.78E1), 3.29201E2, (-2.64E1), 3.24201E2);
        ctx.bezierCurveTo((-2.64E1), 3.24201E2, (-2.28E1), 3.08401E2, (-2.92E1), 3.17001E2);
        ctx.bezierCurveTo((-2.92E1), 3.17001E2, (-2.9E1), 3.25001E2, (-3.72E1), 3.32401E2);
        ctx.bezierCurveTo((-3.72E1), 3.32401E2, (-3.24E1), 3.30001E2, (-3.28E1), 3.34601E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-3.86E1), 3.29601E2);
        ctx.bezierCurveTo((-3.86E1), 3.29601E2, (-3.52E1), 3.12201E2, (-3.44E1), 3.11401E2);
        ctx.bezierCurveTo((-3.44E1), 3.11401E2, (-3.26E1), 3.08001E2, (-3.54E1), 3.11201E2);
        ctx.bezierCurveTo((-3.54E1), 3.11201E2, (-4.42E1), 3.30401E2, (-4.82E1), 3.37001E2);
        ctx.bezierCurveTo((-4.82E1), 3.37001E2, (-4.02E1), 3.27801E2, (-3.86E1), 3.29601E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-4.44E1), 3.13001E2);
        ctx.bezierCurveTo((-4.44E1), 3.13001E2, (-3.28E1), 2.90601E2, (-5.46E1), 3.16401E2);
        ctx.bezierCurveTo((-5.46E1), 3.16401E2, (-4.36E1), 3.06601E2, (-4.44E1), 3.13001E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-5.98E1), 2.98401E2);
        ctx.bezierCurveTo((-5.98E1), 2.98401E2, (-5.5E1), 2.79601E2, (-5.24E1), 2.79801E2);
        ctx.bezierCurveTo((-5.24E1), 2.79801E2, (-4.42E1), 2.70801E2, (-5.08E1), 2.81401E2);
        ctx.bezierCurveTo((-5.08E1), 2.81401E2, (-5.68E1), 2.91001E2, (-5.62E1), 3.00801E2);
        ctx.bezierCurveTo((-5.62E1), 3.00801E2, (-5.68E1), 2.91201E2, (-5.98E1), 2.98401E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(2.705E2, 2.87E2);
        ctx.bezierCurveTo(2.705E2, 2.87E2, 2.585E2, 2.77E2, 2.56E2, 2.735E2);
        ctx.bezierCurveTo(2.56E2, 2.735E2, 2.695E2, 2.92E2, 2.695E2, 2.99E2);
        ctx.bezierCurveTo(2.695E2, 2.99E2, 2.72E2, 2.915E2, 2.705E2, 2.87E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(2.76E2, 2.65E2);
        ctx.bezierCurveTo(2.76E2, 2.65E2, 2.55E2, 2.5E2, 2.515E2, 2.425E2);
        ctx.bezierCurveTo(2.515E2, 2.425E2, 2.78E2, 2.72E2, 2.78E2, 2.765E2);
        ctx.bezierCurveTo(2.78E2, 2.765E2, 2.785E2, 2.675E2, 2.76E2, 2.65E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(2.93E2, 1.11E2);
        ctx.bezierCurveTo(2.93E2, 1.11E2, 2.81E2, 1.03E2, 2.795E2, 1.05E2);
        ctx.bezierCurveTo(2.795E2, 1.05E2, 2.9E2, 1.115E2, 2.925E2, 1.2E2);
        ctx.bezierCurveTo(2.925E2, 1.2E2, 2.91E2, 1.11E2, 2.93E2, 1.11E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = '#cccccc';
        ctx.fillStyle = 'rgba(204,204,204,1)';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(3.015E2, 1.915E2);
        ctx.lineTo(2.84E2, 1.795E2);
        ctx.bezierCurveTo(2.84E2, 1.795E2, 3.03E2, 1.965E2, 3.035E2, 2.005E2);
        ctx.lineTo(3.015E2, 1.915E2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.strokeStyle = '#000000';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.strokeStyle = '#000000';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-8.925E1), 1.69E2);
        ctx.lineTo((-6.725E1), 1.7375E2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.strokeStyle = '#000000';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.strokeStyle = '#000000';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-3.9E1), 3.31E2);
        ctx.bezierCurveTo((-3.9E1), 3.31E2, (-3.95E1), 3.275E2, (-4.85E1), 3.38E2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.strokeStyle = '#000000';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.strokeStyle = '#000000';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo((-3.35E1), 3.36E2);
        ctx.bezierCurveTo((-3.35E1), 3.36E2, (-3.15E1), 3.295E2, (-3.8E1), 3.34E2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.strokeStyle = '#000000';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.strokeStyle = '#000000';
        ctx.font = '10px sans-serif';
        ctx.beginPath();
        ctx.moveTo(2.05E1, 3.445E2);
        ctx.bezierCurveTo(2.05E1, 3.445E2, 2.2E1, 3.335E2, 1.05E1, 3.465E2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        ctx.restore();
        ctx.restore();

    }

    function transform(ctx) {
        // case 1
        ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
        ctx.setTransform(1,1,0,1,0,0);
        ctx.fillRect(0,0,100,100);
        ctx.resetTransform();

        // case 2
        ctx.fillStyle = "red";
        ctx.fillRect(0, 0, 50, 50);
        ctx.resetTransform();

        // case 3
        ctx.fillStyle = "rgba(0, 0, 255, 0.5)";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(100, 0);
        ctx.transform(2, 0, 0, 2, 0, 0);
        ctx.lineTo(100, 100);
        ctx.transform(2, 0, 0, 1, 0, 0);
        ctx.lineTo(100, 100);
        ctx.closePath();
        ctx.fill();
        ctx.resetTransform();
    }

    function pattern(ctx) {
      // Create a pattern
      const patternCanvas = document.createElement('canvas');
      const patternContext = patternCanvas.getContext('2d');

      // Give the pattern a width and height of 50
      patternCanvas.width = 50;
      patternCanvas.height = 50;

      // Give the pattern a background color and draw an arc
      patternContext.fillStyle = '#fec';
      patternContext.fillRect(0, 0, patternCanvas.width, patternCanvas.height);
      patternContext.arc(0, 0, 50, 0, .5 * Math.PI);
      patternContext.stroke();

      const pattern = ctx.createPattern(patternCanvas, 'repeat');
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, 50, 50);

      var img = new Image();
      img.src = 'pattern.png';
      img.onload = function() {
        var pattern = ctx.createPattern(img, 'repeat');
        ctx.fillStyle = pattern;
        ctx.fillRect(50, 50, 300, 300);
      };

    }

    const tests = {
        tiger,
        arc,
        arcTo: arcTo$1,
        arcTo2: arcTo,
        arcToScaled,
        emptyArc,
        ellipse,
        ellipse2,
        fillstyle: fillStyle,
        globalAlpha,
        gradient,
        linecap,
        linewidth,
        scaledLine,
        rgba,
        rotate,
        saveandrestore: saveAndRestore,
        setLineDash,
        text,
        transform,
        pattern
    };

    class RenderingTester {
        constructor(name, fn) {
            this.name = name;
            this.fn = fn;
            this.width = 600;
            this.height = 600;
        }

        async test() {
            const canvas = document.createElement('canvas');
            const svgcanvas = new SVGCanvasElement();

            [canvas, svgcanvas].forEach((canvas) => {
                canvas.width = this.width;
                canvas.height = this.height;
                const ctx = canvas.getContext('2d');
                this.fn(ctx);
            });

            // Pixels
            const svg = svgcanvas.toDataURL("image/svg+xml");
            const svgImage = await new Promise((resolve) => {
                var svgImage = new Image();
                svgImage.onload = function () {
                    resolve(svgImage);
                };
                svgImage.src = svg;
            });
            const svgPixels = this.getPixels(svgImage);
            const canvasPixels = this.getPixels(canvas);
            const diffPixels = this.diffPixels(svgPixels, canvasPixels);
            const removeThinLinesPixels = this.removeThinLines(this.removeThinLines(diffPixels));
            const svgPixelsCount = this.countPixels(svgPixels);
            const canvasPixelsCount = this.countPixels(canvasPixels);
            const count = Math.max(svgPixelsCount, canvasPixelsCount);
            const diffPixelsCount = this.countPixels(removeThinLinesPixels);
            console.log({ fn: this.name, count, diffCount: diffPixelsCount, svgPixelsCount, canvasPixelsCount });
            if (count === 0 && diffPixelsCount === 0) {
                return 0
            }
            const diffRate = diffPixelsCount / count;
            return diffRate;
        }

        getPixels(image) {
            const canvas = document.createElement('canvas');
            const width = this.width;
            const height = this.height;
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0, width, height);
            return ctx.getImageData(0, 0, width, height);
        }

        // count non transparent pixels
        countPixels(imgData) {
            var count = 0;
            for (var i = 3; i < imgData.data.length; i += 4) {
                if (imgData.data[i] > 0) {
                    count++;
                }
            }
            return count;
        };


        diffPixels(imgData1, imgData2) {
            const canvas = document.createElement('canvas');
            const width = this.width;
            const height = this.height;
            const diffImgData = canvas.getContext('2d').getImageData(0, 0, width, height);
            for (var i = 0; i < imgData1.data.length; i += 4) {
                var indexes = [i, i + 1, i + 2, i + 3];
                indexes.forEach(function (i) {
                    diffImgData.data[i] = 0;
                });
                if (indexes.some(function (i) {
                    return Math.abs(imgData1.data[i] - imgData2.data[i]) > 0;
                })) {
                    diffImgData.data[i + 3] = 255; // set black
                }
            }
            return diffImgData;
        }

        removeThinLines(imageData) {
            const canvas = document.createElement('canvas');
            const width = this.width;
            const height = this.height;
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.putImageData(imageData, 0, 0);
            var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            var imgDataCopy = ctx.getImageData(0, 0, canvas.width, canvas.height);

            var getPixelIndex = function (x, y) {
                return (y * width + x) * 4 + 3;
            };

            var getPixel = function (x, y) {
                var alphaIndex = getPixelIndex(x, y);
                return imgDataCopy.data[alphaIndex];
            };

            var setPixel = function (x, y, value) {
                imgData.data[getPixelIndex(x, y)] = value;
            };

            for (var x = 1; x < width - 1; x++) {
                for (var y = 1; y < height - 1; y++) {
                    if (getPixel(x, y) == 0) {
                        continue; // ignore transparents
                    }
                    var links = [
                        { x: x - 1, y: y - 1 },
                        { x: x, y: y - 1 },
                        { x: x + 1, y: y - 1 },
                        { x: x - 1, y: y },
                        { x: x + 1, y: y },
                        { x: x - 1, y: y + 1 },
                        { x: x, y: y + 1 },
                        { x: x + 1, y: y + 1 }
                    ].map(function (p) {
                        return getPixel(p.x, p.y);
                    }).filter(function (val) {
                        return val > 0; // not transparent?
                    }).length;

                    if (links < 5) { // is a thin line
                        setPixel(x, y, 0); // make it transparent
                    }
                }
            }
            return imgData;
        }
    }

    describe('RenderTest', () => {
        for (let fn of Object.keys(tests)) {
            it(`should render same results for ${fn}`, async () => {
                const tester = new RenderingTester(fn, tests[fn]);
                const diffRate = await tester.test();
                expect(diffRate).to.lessThan(0.05);
            });
        }
    });

})();
//# sourceMappingURL=rendering.test.js.map
