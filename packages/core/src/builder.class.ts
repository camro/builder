import { nextTick } from './functions/next-tick.function';
import { QueryString } from './classes/query-string.class';
import { version } from '../package.json';
import { BehaviorSubject } from './classes/observable.class';
import { fetch } from './functions/fetch.function';
import { assign } from './functions/assign.function';
import { throttle } from './functions/throttle.function';
import { Animator } from './classes/animator.class';
import { BuilderElement } from './types/element';
// import finder from './functions/finder.function';
export type Url = any;

const urlParser = {
  parse(url: string) {
    const parser = document.createElement('a') as any;
    parser.href = url;
    const out: any = {};
    const props = 'username password host hostname port protocol origin pathname search hash'.split(
      ' '
    );
    for (let i = props.length; i--; ) out[props[i]] = parser[props[i]];
    return out;
  },
};
const parse = typeof window === 'object' ? urlParser.parse : require('url').parse;

function setCookie(name: string, value: string, expires?: Date) {
  let expiresString = '';
  // TODO: need to know if secure server side
  if (expires) {
    expiresString = '; expires=' + expires.toUTCString();
  }
  const secure = isBrowser ? location.protocol === 'https:' : true;
  document.cookie =
    name + '=' + (value || '') + expiresString + '; path=/' + (secure ? ';secure' : '');
}

function getCookie(name: string) {
  return (
    decodeURIComponent(
      document.cookie.replace(
        new RegExp(
          '(?:(?:^|.*;)\\s*' +
            encodeURIComponent(name).replace(/[\-\.\+\*]/g, '\\$&') +
            '\\s*\\=\\s*([^;]*).*$)|^.*$'
        ),
        '$1'
      )
    ) || null
  );
}

function size(object: object) {
  return Object.keys(object).length;
}

function find<T = any>(target: T[], callback: (item: T, index: number, list: T[]) => boolean) {
  const list = target;
  // Makes sures is always has an positive integer as length.
  const length = list.length >>> 0;
  const thisArg = arguments[1];
  for (let i = 0; i < length; i++) {
    const element = list[i];
    if (callback.call(thisArg, element, i, list)) {
      return element;
    }
  }
}

export type Observer<T = any> = any;

const sessionStorageKey = 'builderSessionId';
// TODO: manually type this out
type ContentModelType = any;

export const isBrowser = typeof window !== 'undefined';
export const isIframe = isBrowser && window.top !== window.self;

export interface ParamsMap {
  [key: string]: any;
}

// TODO: share interfaces with API
interface Event {
  type: 'click' | 'impression';
  data: {
    contentId: string;
    ownerId: string;
    variationId?: string;
    userAttributes?: any;
    targetSelector?: string;
    targetBuilderElement?: string;
    unique?: boolean;
    metadata?: any | string;
    sessionId?: string;
  };
}

export interface UserAttributes {
  urlPath?: string;
  queryString?: string | ParamsMap;
  device?: 'mobile' | 'tablet' | 'desktop';
  location?: any; // TODO: what format? IP address? Geo coords?
  userAgent?: string;
  referrer?: string;
  entryMedium?: string;
  language?: string;
  browser?: string;
  cookie?: string;
  newVisitor?: boolean;
  operatingSystem?: string;
}

export interface GetContentOptions {
  userAttributes?: UserAttributes;
  limit?: number;
  query?: any;
  cachebust?: boolean;
  prerender?: boolean;
  extractCss?: boolean;
  offset?: number;
  initialContent?: any;
  model?: string;
  // TODO: more caching options like max age etc
  cache?: boolean;
  preview?: boolean;
  entry?: string;
  alias?: string;
  key?: string;
}

export type Class = {
  name?: string;
  new (...args: any[]): any;
};

export interface Input {
  name: string;
  friendlyName?: string;
  description?: string;
  defaultValue?: any;
  type: string;
  required?: boolean;
  subFields?: Input[];
  helperText?: string;
  allowedFileTypes?: string[];
  imageHeight?: number;
  imageWidth?: number;
  mediaHeight?: number;
  mediaWidth?: number;
  hideFromUI?: boolean;
  modelId?: string;
  enum?: string[] | { label: string; value: any; helperText?: string }[];
  advanced?: boolean;
  onChange?: Function | string;
  showIf?: ((options: Map<string, any>) => boolean) | string;
}

export interface Component {
  name: string;
  description?: string;
  image?: string;
  inputs?: Input[];
  class?: Class;
  type?: 'angular' | 'webcomponent' | 'react' | 'vue';
  defaultStyles?: { [key: string]: string };
  canHaveChildren?: boolean;
  fragment?: boolean;
  noWrap?: boolean;
  defaultChildren?: BuilderElement[];
  defaults?: Partial<BuilderElement>;
  hooks?: { [key: string]: string | Function };
  hideFromInsertMenu?: boolean;
}

export function BuilderComponent(info: Partial<Component> = {}) {
  return Builder.Component(info);
}

export interface Action {
  name: string;
  inputs?: Input[];
  returnType?: Input;
  action: Function | string;
}

export class Builder {
  static components: Component[] = [];
  static nextTick = nextTick;
  static VERSION = version;
  static useNewApi = true;
  static animator = new Animator();

  static actions: Action[] = [];

  static registerAction(action: Action) {
    this.actions.push(action);
  }

  static runAction(action: Action | string) {
    // TODO
    const actionObject =
      typeof action === 'string' ? find(this.actions, item => item.name === action) : action;

    if (!actionObject) {
      throw new Error(`Action not found: ${action}`);
    }
  }

  static fields(name: string, fields: Input[]) {
    window.parent.postMessage(
      {
        type: 'builder.fields',
        data: { name, fields },
      },
      '*'
    );
  }

  private static _editingPage = false;

  static isIframe = isIframe;
  static isBrowser = isBrowser;

  // TODO: this is quick and dirty, do better implementation later. Also can be unreliable
  // if page 301s etc. Use a query param instead? also could have issues with redirects. Injecting var could
  // work but is async...
  static isEditing = Boolean(isIframe && document.referrer.match(/builder\.io|localhost:1234/));

  // useCdnApi = false;

  static get editingPage() {
    return this._editingPage;
  }

  static set editingPage(editingPage) {
    this._editingPage = editingPage;
    if (isBrowser && isIframe) {
      if (editingPage) {
        document.body.classList.add('builder-editing-page');
      } else {
        document.body.classList.remove('builder-editing-page');
      }
    }
  }

  private static prepareComponentSpecToSend(spec: Component): Component {
    return {
      ...spec,
      ...(spec.inputs && {
        inputs: spec.inputs.map((input: any) => {
          // TODO: do for nexted fields too
          // TODO: probably just convert all functions, not just
          // TODO: put this in input hooks: { onChange: ..., showIf: ... }
          const keysToConvertFnToString = ['onChange', 'showIf'];

          for (const key of keysToConvertFnToString) {
            if (input[key] && typeof input[key] === 'function') {
              const fn = input[key];
              input = {
                ...input,
                [key]: `return (${fn.toString()}).apply(this, arguments)`,
              };
            }
          }

          return input;
        }),
      }),
      hooks: Object.keys(spec.hooks || {}).reduce(
        (memo, key) => {
          const value = spec.hooks && spec.hooks[key];
          if (!value) {
            return memo;
          }
          if (typeof value === 'string') {
            memo[key] = value;
          } else {
            memo[key] = `return (${value.toString()}).apply(this, arguments)`;
          }
          return memo;
        },
        {} as { [key: string]: string }
      ),
      class: undefined,
    };
  }

  // TODO: style guide, etc off this system as well?
  static component(info: Partial<Component> = {}) {
    return (component: Class) => {
      const spec = { ...info, class: component };
      if (!spec.name) {
        spec.name = component.name;
      }
      if (!find(this.components, item => item.name === spec.name)) {
        this.components.push(spec as Component);

        const sendSpec = this.prepareComponentSpecToSend(spec as Component);
        // TODO: serialize component name and inputs
        if (isBrowser) {
          window.parent.postMessage(
            {
              type: 'builder.registerComponent',
              data: sendSpec,
            },
            '*'
          );
        }
      }
      return component;
    };
  }

  static isReact = false;

  static get Component() {
    return this.component;
  }

  private eventsQueue: Event[] = [];

  private throttledClearEventsQueue = throttle(() => {
    this.processEventsQueue();
  }, 100);

  private processEventsQueue() {
    if (!this.eventsQueue.length) {
      return;
    }
    const events = this.eventsQueue;
    this.eventsQueue = [];

    // TODO: centralize this
    const host = this.host;

    fetch(`${host}/api/v1/track`, {
      method: 'POST',
      body: JSON.stringify({ events }),
      headers: {
        'content-type': 'application/json',
      },
      mode: 'cors',
    });
  }

  env: 'production' | 'qa' | 'development' | 'dev' = 'production';

  protected isUsed = false;
  sessionId = this.getSessionId();

  targetContent = true;

  // TODO: api options object
  private cachebust = false;
  private noCache = false;
  private overrideHost = '';
  private preview = false;

  get browserTrackingDisabled() {
    return Builder.isBrowser && (navigator as any).doNotTrack === '1';
  }

  get canTrack() {
    return this.canTrack$.value && !this.browserTrackingDisabled;
  }

  set canTrack(canTrack) {
    if (this.canTrack !== canTrack) {
      this.canTrack$.next(canTrack);
    }
  }

  private canTrack$ = new BehaviorSubject(!this.browserTrackingDisabled);
  private apiKey$ = new BehaviorSubject<string | null>(null);

  get editingMode() {
    return this.editingMode$.value;
  }

  set editingMode(value) {
    if (value !== this.editingMode) {
      this.editingMode$.next(value);
    }
  }

  editingMode$ = new BehaviorSubject(isIframe);

  get editingModel() {
    return this.editingModel$.value;
  }

  set editingModel(value) {
    if (value !== this.editingModel) {
      this.editingModel$.next(value);
    }
  }

  private findParentElement(
    target: HTMLElement,
    callback: (element: HTMLElement) => boolean,
    checkElement = true
  ): HTMLElement | null {
    if (!(target instanceof HTMLElement)) {
      return null;
    }
    let parent: HTMLElement | null = checkElement ? target : target.parentElement;
    do {
      if (!parent) {
        return null;
      }

      const matches = callback(parent);
      if (matches) {
        return parent;
      }
    } while ((parent = parent.parentElement));

    return null;
  }

  private findBuilderParent(target: HTMLElement) {
    return this.findParentElement(target, el => {
      const id = el.getAttribute('builder-id') || el.id;
      return Boolean(id && id.indexOf('builder-') === 0);
    });
  }

  // TODO: decorator to do this stuff with the get/set (how do with typing too? compiler?)
  editingModel$ = new BehaviorSubject<null | string>(null);

  setUserAgent(userAgent: string) {
    this.userAgent = userAgent || '';
  }
  userAgent: string = (typeof navigator === 'object' && navigator.userAgent) || '';

  track(eventName: string, properties: any = {}) {
    // TODO: queue up track requests and fire them off when canTrack set to true - otherwise may get lots of clicks with no impressions
    if (isIframe || !isBrowser) {
      return;
    }
    // batch events
    this.eventsQueue.push({
      type: 'impression',
      data: {
        metadata: {
          sdkVersion: Builder.VERSION,
          url: location.href,
        },
        ...properties,
        userAttributes: this.getUserAttributes(),
        sessionId: this.sessionId,
        // TODO: user properties like visitor id, location path, device, etc
      },
    });

    if (this.canTrack) {
      this.throttledClearEventsQueue();
    }
  }

  getSessionId() {
    // TODO: don't set this until gdpr allowed....
    let sessionId =
      (Builder.isBrowser &&
        (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(sessionStorageKey))) ||
      '';

    if (!sessionId) {
      sessionId = (Date.now() + Math.random()).toString(36);
    }

    // Give the app a second to start up and set canTrack to false if needed
    if (Builder.isBrowser) {
      setTimeout(() => {
        if (this.canTrack && typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(sessionStorageKey, sessionId);
        }
      });
    }
    return sessionId;
  }

  trackImpression(contentId: string, variationId?: string) {
    if (isIframe || !isBrowser) {
      return;
    }
    // TODO: use this.track method
    this.eventsQueue.push({
      type: 'impression',
      data: {
        contentId,
        variationId: variationId !== contentId ? variationId : undefined,
        ownerId: this.apiKey as string,
        userAttributes: this.getUserAttributes(),
        sessionId: this.sessionId,
      },
    });
    this.throttledClearEventsQueue();
  }

  autoTrack =
    !this.isDevelopmentEnv &&
    !(Builder.isBrowser && location.search.indexOf('builder.preview=true') !== -1);

  useNewContentApi = false;

  // TODO: set this for QA
  private get isDevelopmentEnv() {
    // Automatic determining of development environment
    return (
      Builder.isIframe ||
      (Builder.isBrowser && (location.hostname === 'localhost' || location.port !== '')) ||
      this.env !== 'production'
    );
  }

  trackInteraction(
    contentId: string,
    variationId?: string,
    alreadyTrackedOne = false,
    event?: MouseEvent
  ) {
    if (isIframe || !isBrowser) {
      return;
    }
    const target = event && (event.target as HTMLElement);
    const targetBuilderElement = target && this.findBuilderParent(target);

    function round(num: number) {
      return Math.round(num * 1000) / 1000;
    }

    const metadata: any = {};
    if (event) {
      const { clientX, clientY } = event;
      if (target) {
        const targetRect = target.getBoundingClientRect();
        const xOffset = clientX - targetRect.left;
        const yOffset = clientY - targetRect.top;

        const xRatio = round(xOffset / targetRect.width);
        const yRatio = round(yOffset / targetRect.height);

        metadata.targetOffset = {
          x: xRatio,
          y: yRatio,
        };
      }
      if (targetBuilderElement) {
        const targetRect = targetBuilderElement.getBoundingClientRect();
        const xOffset = clientX - targetRect.left;
        const yOffset = clientY - targetRect.top;

        const xRatio = round(xOffset / targetRect.width);
        const yRatio = round(yOffset / targetRect.height);

        metadata.builderTargetOffset = {
          x: xRatio,
          y: yRatio,
        };
      }
    }

    // let selector: string | undefined = undefined;
    // if (target) {
    //   try {
    //     selector = finder(target);
    //   } catch (err) {
    //     // nbd
    //   }
    // }

    const builderId =
      targetBuilderElement &&
      (targetBuilderElement.getAttribute('builder-id') || targetBuilderElement.id);

    // TODO: use this.track method
    this.eventsQueue.push({
      type: 'click',
      data: {
        contentId,
        metadata,
        variationId: variationId !== contentId ? variationId : undefined,
        ownerId: this.apiKey as string,
        unique: !alreadyTrackedOne,
        // targetSelector: selector,
        targetBuilderElement: builderId || undefined,
        userAttributes: this.getUserAttributes(),
        sessionId: this.sessionId,
      },
    });
    this.throttledClearEventsQueue();
  }

  static overrideUserAttributes: Partial<UserAttributes> = {};

  component(info: Partial<Component> = {}) {
    return Builder.component(info);
  }

  get apiKey() {
    return this.apiKey$.value;
  }

  set apiKey(key: string | null) {
    this.apiKey$.next(key);
  }

  constructor(apiKey: string | null = null) {
    if (apiKey) {
      this.apiKey = apiKey;
    }
    if (isBrowser) {
      this.bindMessageListeners();
      // TODO: postmessage to parent the builder info for every package
      // type: 'builder.sdk', data: { name: '@builder.io/react', version: '0.1.23' }
      // (window as any).BUILDER_VERSION = Builder.VERSION;
      // Ensure always one Builder global singleton
      // TODO: some people won't want this, e.g. rakuten
      // Maybe hide this behind symbol or on document, etc
      // if ((window as any).Builder) {
      //   Builder.components = (window as any).Builder.components;
      // } else {
      //   (window as any).Builder = Builder;
      // }
    }

    if (isIframe) {
      this.messageFrameLoaded();
    }

    // TODO: on destroy clear subscription
    this.canTrack$.subscribe((value: any) => {
      if (value) {
        if (typeof sessionStorage !== 'undefined') {
          if (!sessionStorage.getItem(sessionStorageKey)) {
            sessionStorage.setItem(sessionStorageKey, this.sessionId);
          }
        }
        if (this.eventsQueue.length) {
          this.throttledClearEventsQueue();
        }
        if (this.cookieQueue.length) {
          this.cookieQueue.forEach(item => {
            this.setCookie(item[0], item[1]);
          });
          this.cookieQueue.length = 0;
        }
      }
    });

    if (isBrowser) {
      // TODO: defer so subclass constructor runs and injects location service
      this.setTestsFromUrl();
      // TODO: do this on every request send?
      this.getOverridesFromQueryString();
    }
  }

  private modifySearch(search: string) {
    return search.replace(
      /(^|&|\?)(builder_.*?)=/gi,
      (_match, group1, group2) => group1 + group2.replace(/_/g, '.') + '='
    );
  }

  setTestsFromUrl() {
    const search = this.getLocation().search;
    const params = QueryString.parseDeep(this.modifySearch(search || '').substr(1));
    const tests = params.builder && params.builder.tests;
    if (tests && typeof tests === 'object') {
      for (const key in tests) {
        if (tests.hasOwnProperty(key)) {
          this.setTestCookie(key, tests[key]);
        }
      }
    }
  }

  getOverridesFromQueryString() {
    const location = this.getLocation();
    const params = QueryString.parseDeep(this.modifySearch(location.search || '').substr(1));
    const { builder } = params;
    if (builder) {
      const { userAttributes, overrides, env, host, api, cachebust, noCache, preview } = builder;
      if (userAttributes) {
        this.setUserAttributes(userAttributes);
      }
      if (overrides) {
        this.overrides = overrides;
      }
      if (env || api) {
        this.env = env || api;
      }
      if (host) {
        this.overrideHost = host;
      }
      if (cachebust) {
        this.cachebust = true;
      }
      if (noCache) {
        this.noCache = true;
      }

      if (preview) {
        this.preview = true;
      }
    }
  }

  private messageFrameLoaded() {
    window.parent.postMessage(
      {
        type: 'builder.loaded',
        data: {
          value: true,
        },
      },
      '*'
    );
  }

  private blockContentLoading = '';

  private bindMessageListeners() {
    if (isBrowser) {
      addEventListener('message', event => {
        const url = parse(event.origin);
        const allowedHosts = ['builder.io', 'localhost', 'local.builder.io', 'qa.builder.io'];
        if (allowedHosts.indexOf(url.hostname as string) === -1) {
          return;
        }

        const { data } = event;
        if (data) {
          switch (data.type) {
            case 'builder.ping': {
              window.parent.postMessage(
                {
                  type: 'builder.pong',
                  data: {},
                },
                '*'
              );
              break;
            }
            case 'builder.triggerAnimation': {
              Builder.animator.triggerAnimation(data.data);
              break;
            }
            case 'builder.contentUpdate':
              const key =
                data.data.key || data.data.alias || data.data.entry || data.data.modelName;
              const contentData = data.data.data; // hmmm...
              const observer = this.observersByKey[key];
              if (observer) {
                observer.next([contentData]);
              }
              break;

            case 'builder.getComponents':
              window.parent.postMessage(
                {
                  type: 'builder.components',
                  data: Builder.components.map(item => Builder.prepareComponentSpecToSend(item)),
                },
                '*'
              );
              break;

            case 'builder.editingModel':
              this.editingModel = data.data.model;
              break;

            case 'builder.registerComponent':
              const componentData = data.data;
              Builder.components.push(componentData);
              break;

            case 'builder.blockContentLoading':
              if (typeof data.data.model === 'string') {
                this.blockContentLoading = data.data.model;
              }
              break;

            case 'builder.editingMode':
              const editingMode = data.data;
              if (editingMode) {
                this.editingMode = true;
                document.body.classList.add('builder-editing');
              } else {
                this.editingMode = false;
                document.body.classList.remove('builder-editing');
              }
              break;

            case 'builder.editingPageMode':
              const editingPageMode = data.data;
              Builder.editingPage = editingPageMode;
              break;

            case 'builder.overrideUserAttributes':
              const userAttributes = data.data;
              assign(Builder.overrideUserAttributes, userAttributes);
              this.flushGetContentQueue(true);
              // TODO: refetch too
              break;

            case 'builder.overrideTestGroup':
              const { variationId, contentId } = data.data;
              if (variationId && contentId) {
                this.setTestCookie(contentId, variationId);
                this.flushGetContentQueue(true);
              }
              break;
            case 'builder.evaluate': {
              const text = data.data.text;
              const args = data.data.arguments || [];
              const id = data.data.id;
              // tslint:disable-next-line:no-function-constructor-with-string-args
              const fn = new Function(text);
              let result: any;
              let error: Error | null = null;
              try {
                result = fn.apply(this, args);
              } catch (err) {
                error = err;
              }

              if (error) {
                window.parent.postMessage(
                  {
                    type: 'builder.evaluateError',
                    data: { id, error: error.message },
                  },
                  '*'
                );
              } else {
                if (result && typeof result.then === 'function') {
                  (result as Promise<any>)
                    .then(finalResult => {
                      window.parent.postMessage(
                        {
                          type: 'builder.evaluateResult',
                          data: { id, result: finalResult },
                        },
                        '*'
                      );
                    })
                    .catch(console.error);
                } else {
                  window.parent.postMessage(
                    {
                      type: 'builder.evaluateResult',
                      data: { result, id },
                    },
                    '*'
                  );
                }
              }
              break;
            }
          }
        }
      });
    }
  }

  observersByKey: { [key: string]: Observer<any> | undefined } = {};

  init(apiKey: string, canTrack = true) {
    this.canTrack = canTrack;
    this.apiKey = apiKey;
    return this;
  }

  // TODO: allow adding location object as property and/or in constructor
  getLocation(): Url {
    return (typeof location === 'object' && parse(location.href)) || ({} as any);
  }

  getUserAttributes(userAgent = this.userAgent || '') {
    this.isUsed = true;

    // TODO: detect desktop browser and OS too
    // TODO: add user agent lib back
    const isMobile = {
      Android() {
        return userAgent.match(/Android/i);
      },
      BlackBerry() {
        return userAgent.match(/BlackBerry/i);
      },
      iOS() {
        return userAgent.match(/iPhone|iPad|iPod/i);
      },
      Opera() {
        return userAgent.match(/Opera Mini/i);
      },
      Windows() {
        return userAgent.match(/IEMobile/i) || userAgent.match(/WPDesktop/i);
      },
      any() {
        return (
          isMobile.Android() ||
          isMobile.BlackBerry() ||
          isMobile.iOS() ||
          isMobile.Opera() ||
          isMobile.Windows()
        );
      },
    };

    // FIXME
    const url = this.getLocation();

    // const device = ua.getDevice();
    // TODO: get these from exension as well
    return {
      // Removing because blowing out cache keys
      // queryString: url.search,
      urlPath: url.pathname,
      // Removinf for now because of cache keys
      // referrer: document.referrer,
      // language: navigator.language.split('-')[0],
      device: isMobile.any() ? 'mobile' : 'desktop',
      // operatingSystem: (ua.getOS().name || '').toLowerCase() || undefined,
      // browser: (ua.getBrowser().name || '').toLowerCase() || undefined,
      ...Builder.overrideUserAttributes,
    } as UserAttributes;
  }

  protected overrides: { [key: string]: string } = {};

  setUserAttributes(options: object) {
    assign(Builder.overrideUserAttributes, options);
  }

  private getContentQueue: null | GetContentOptions[] = null;
  private priorContentQueue: null | GetContentOptions[] = null;

  get(modelName: string, options: GetContentOptions = {}) {
    return this.queueGetContent(modelName, options).map(
      /* map( */ (matches: any[]) => {
        const match = matches && matches[0];
        const matchData = match && match.data;
        if (!matchData) {
          return null;
        }
        return {
          // TODO: add ab test info here and other high level stuff
          data: matchData,
          id: match.id,
          testVariationId: match.testVariationId,
          testVariationName: match.testVariationName,
        };
      }
    );
    // );
  }

  // TODO: entry id in options
  queueGetContent(modelName: string, options: GetContentOptions = {}) {
    // TODO: if query do modelName + query
    const key =
      options.key ||
      options.alias ||
      // TODO: SDKs only pass entry key when given to them, and never when editing...
      // options.entry ||

      // TODO: this is ugly - instead of multiple of same model with different options are sent
      // say requires key/alias. Or if not perhaps make a reliable hash of the options and use that.
      // TODO: store last user state on last request and if user attributes different now
      // give a warning that need to use keys to request new contente
      // (options &&
      //   Object.keys(options).filter(key => key !== 'model').length &&
      //   JSON.stringify({ model: modelName, ...options, initialContent: undefined })) ||
      modelName;

    const isEditingThisModel = this.editingModel === modelName;
    // TODO: include params in this key........
    const currentObservable = this.observersByKey[key] as BehaviorSubject<ContentModelType> | null;

    // if (options.query && options.query._id) {
    //   this.flushGetContentQueue([options])
    // }

    if (this.apiKey === 'DEMO' && !this.overrides[key] && !options.initialContent) {
      options.initialContent = [];
    }

    const { initialContent } = options;

    // TODO: refresh option in options
    if (currentObservable && (!currentObservable.value || options.cache)) {
      // TODO: test if this ran, otherwise on 404 some observers may never be called...
      if (currentObservable.value) {
        nextTick(() => {
          // TODO: return a new observable and only that one fires subscribers, don't refire for existing ones
          currentObservable.next(currentObservable.value);
        });
      }
      return currentObservable;
    }
    if (isEditingThisModel) {
      if (Builder.isBrowser) {
        parent.postMessage({ type: 'builder.updateContent' }, '*');
      }
    }
    if (!initialContent /* || isEditingThisModel */) {
      if (!this.getContentQueue) {
        this.getContentQueue = [];
        nextTick(() => {
          this.flushGetContentQueue();
        });
      }

      this.getContentQueue.push({ ...options, model: modelName, key });
    }

    const observable = new BehaviorSubject<ContentModelType>(null);
    this.observersByKey[key] = observable;
    if (initialContent) {
      nextTick(() => {
        observable.next(initialContent);
      });
    }
    return observable;
  }

  requestUrl(url: string) {
    return fetch(url).then(res => res.json());
  }

  get host() {
    if (this.overrideHost) {
      return this.overrideHost;
    }
    switch (this.env) {
      case 'qa':
        return 'https://qa.builder.io';
      case 'development':
      case 'dev':
        return 'http://localhost:5000';
      default:
        return 'https://cdn.builder.io';
    }
  }

  private flushGetContentQueue(usePastQueue = false, useQueue?: GetContentOptions[]) {
    if (!this.apiKey) {
      throw new Error('Builder needs to be initialized with an API key!');
    }

    if (!usePastQueue && !this.getContentQueue) {
      return;
    }

    const queue = useQueue || (usePastQueue ? this.priorContentQueue : this.getContentQueue) || [];

    // TODO: do this on every request send?
    this.getOverridesFromQueryString();

    const queryParams: ParamsMap = {};
    const pageQueryParams: ParamsMap =
      typeof location !== 'undefined'
        ? QueryString.parseDeep(location.search.substr(1))
        : undefined || {};

    const userAttributes =
      // FIXME: HACK: only checks first in queue for user attributes overrides, should check all
      queue && queue[0].userAttributes
        ? queue[0].userAttributes
        : this.targetContent
        ? this.getUserAttributes()
        : {
            urlPath: this.getLocation().pathname,
          };

    // TODO: merge in the attribute from query string ones
    // TODO: make this an option per component/request
    queryParams.userAttributes = Builder.useNewApi
      ? userAttributes
      : JSON.stringify(userAttributes);

    if (!usePastQueue && !useQueue) {
      this.priorContentQueue = queue;
      this.getContentQueue = null;
    }

    const cachebust =
      this.cachebust ||
      isIframe ||
      pageQueryParams.cachebust ||
      pageQueryParams['builder.cachebust'];

    if (cachebust || this.env !== 'production') {
      queryParams.cachebust = true;
      queryParams.cachebuster = Date.now();
    }

    if (this.noCache || this.env !== 'production') {
      queryParams.noCache = true;
    }

    if (size(this.overrides)) {
      for (const key in this.overrides) {
        if (this.overrides.hasOwnProperty(key)) {
          queryParams[`overrides.${key}`] = this.overrides[key];
        }
      }
    }

    if (Builder.useNewApi && !Builder.isReact) {
      // TODO: remove me once v1 page editors converted to v2
      // queryParams.extractCss = true;
      queryParams.prerender = true;
    }

    if (Builder.useNewApi) {
      for (const options of queue) {
        const properties: (keyof GetContentOptions)[] = [
          'prerender',
          'extractCss',
          'limit',
          'offset',
          'query',
          'preview',
          'model',
          'entry',
        ];
        for (const key of properties) {
          const value = options[key];
          if (value !== undefined) {
            queryParams.options = queryParams.options || {};
            queryParams.options[options.key!] = queryParams.options[options.key!] || {};
            queryParams.options[options.key!][key] = JSON.stringify(value);
          }
        }
      }
    }
    if (this.preview) {
      queryParams.preview = 'true';
    }
    const hasParams = Object.keys(queryParams).length > 0;

    // TODO: option to force dev or qa api here
    const host = this.useNewContentApi ? 'https://lambda.builder.codes' : this.host;

    const keyNames = queue.map(item => encodeURIComponent(item.key!)).join(',');

    const queryStr = Builder.useNewApi
      ? QueryString.stringifyDeep(queryParams)
      : QueryString.stringify(queryParams);

    const promise = this.requestUrl(
      `${host}/api/v1/${Builder.useNewApi ? 'query' : 'content'}/${this.apiKey}/${keyNames}` +
        (queryParams && hasParams ? `?${queryStr}` : '')
    ).then(
      result => {
        for (const options of queue) {
          const keyName = options.key!;
          if (options.model === this.blockContentLoading) {
            continue;
          }
          const isEditingThisModel = this.editingModel === options.model;
          if (isEditingThisModel) {
            parent.postMessage({ type: 'builder.updateContent' }, '*');
            return;
          }
          const observer = this.observersByKey[keyName];
          if (!observer) {
            return;
          }
          const data = result[keyName];
          const sorted = data; // sortBy(data, item => item.priority);
          if (data) {
            const testModifiedResults = this.processResultsForTests(sorted);
            observer.next(testModifiedResults);
          } else {
            observer.next([]);
          }
        }
      },
      err => {
        for (const options of queue) {
          const observer = this.observersByKey[options.key!];
          if (!observer) {
            return;
          }
          observer.error(err);
        }
      }
    );

    return promise;
  }

  private testCookiePrefix = 'builder.tests';

  private processResultsForTests(results: ContentModelType[]) {
    const mappedResults = results.map(item => {
      if (!item.variations) {
        return item;
      }
      const cookieValue = this.getTestCookie(item.id);
      const cookieVariation = cookieValue === item.id ? item : item.variations[cookieValue];
      if (cookieVariation) {
        return { ...item, data: cookieVariation.data, variationId: cookieValue };
      }
      if (item.variations && size(item.variations)) {
        let n = 0;
        const random = Math.random();
        for (const id in item.variations) {
          const variation = item.variations[id];
          const testRatio = variation.testRatio;
          n += testRatio;
          if (random < n) {
            this.setTestCookie(item.id, variation.id);
            return {
              ...item,
              data: variation.data,
              variationId: variation.id,
              testVariationId: variation.id,
              testVariationName: variation.name,
            };
          }
        }
        this.setTestCookie(item.id, item.id);
      }
      return {
        ...item,
        variationId: item.id,
        ...(item.variations &&
          size(item.variations) && {
            testVariationId: item.id,
            testVariationName: 'default',
          }),
      };
    });

    if (isIframe) {
      window.parent.postMessage(
        { type: 'builder.contentResults', data: { results: mappedResults } },
        '*'
      );
    }

    return mappedResults;
  }

  private getTestCookie(contentId: string) {
    return this.getCookie(`${this.testCookiePrefix}.${contentId}`);
  }

  private cookieQueue: [string, string][] = [];

  private setTestCookie(contentId: string, variationId: string) {
    if (!this.canTrack) {
      this.cookieQueue.push([contentId, variationId]);
      return;
    }

    // 30 days from now
    const future = new Date();
    future.setDate(future.getDate() + 30);

    return this.setCookie(`${this.testCookiePrefix}.${contentId}`, variationId, future);
  }

  protected getCookie(name: string): any {
    return getCookie(name);
  }

  protected setCookie(name: string, value: any, expires?: Date) {
    return setCookie(name, value, expires);
  }

  getContent(modelName: string, options: GetContentOptions = {}) {
    if (!this.apiKey) {
      throw new Error('Builder needs to be initialized with an API key!');
    }

    return this.queueGetContent(modelName);
  }
}
