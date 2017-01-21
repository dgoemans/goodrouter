

export interface RouteState {
    prevStack: string[];
    prevParams: any;
    nextStack: string[];
    nextParams: any;
    context: any;
    child?: any;
}


export type RouterHook = (this: Router, state: RouteState) => Promise<any> | any;


export interface RouteConfig {
    name: string;
    path?: string;
    parent?: string;
    render?: RouterHook;
    isEnteringRoute?: RouterHook;
    hasEnteredRoute?: RouterHook;
    routeIsChanging?: RouterHook;
    routeHasChanged?: RouterHook;
    isLeavingRoute?: RouterHook;
    hasLeftRoute?: RouterHook;
}


export class RoutePath {
    private parts = [] as string[];
    private params = [] as string[];
    private paramCount = 0;

    constructor(private readonly path: string) {
        const re = /\:(\w+)/g;
        let index = 0;
        for (let match = re.exec(path); match; match = re.exec(path)) {
            this.parts.push(path.substring(index, match.index));
            this.params.push(match[1]);
            index = match.index + match[0].length;
            this.paramCount++;
        }
        this.parts.push(path.substring(index));
    }


    build(params: any) {
        let str = this.parts[0];
        for (let paramIndex = 0; paramIndex < this.paramCount; paramIndex++) {
            const part = this.parts[paramIndex + 1];
            const param = this.params[paramIndex];
            if (!(param in params)) throw new Error(`missing param ${param}`);
            str += params[param];
            str += this.parts[paramIndex + 1];
        }
        return str;
    }

    match(path: string) {
        if (!path.startsWith(this.parts[0])) return null;
        const pathRest = path.substring(this.parts[0].length);

        let values = {};
        let index = 0;
        let lastIndex = 0;
        for (let paramIndex = 0; paramIndex < this.paramCount; paramIndex++) {
            const part = this.parts[paramIndex + 1];
            index = part === "" ? pathRest.length : pathRest.indexOf(part, index);
            if (index < 0) return null;
            const param = this.params[paramIndex];
            const value = pathRest.substring(lastIndex, index);
            values[param] = value;
            index += part.length;
            lastIndex = index;
        }
        if (index < pathRest.length) return null;
        return values;
    }
}


export class Router {
    private readonly routePathIndex: { [name: string]: RoutePath };
    private readonly routeIndex: { [name: string]: RouteConfig };
    private lastRoute = null as RouteConfig;
    private lastParams = {};
    private readonly transitionHookStack = [] as RouterHook[];

    constructor(routeList: RouteConfig[]) {
        this.routeIndex = routeList.reduce((index, route) => Object.assign(index, { [route.name]: route }), {});
        this.routePathIndex = routeList.filter(router => router.path).reduce((index, route) => Object.assign(index, { [route.name]: new RoutePath(route.path) }), {});
    }

    registerTransitionHook(hook: RouterHook) {
        this.transitionHookStack.push(hook);
    }

    path(name: string, params: any) {
        const routePath = this.routePathIndex[name];
        if (!routePath) throw new Error(`route ${name} not found`);
        const path = routePath.build(params);
        return path;
    }

    async transition(path: string, context: any = null) {
        const {lastParams: prevParams, lastRoute: prevRoute} = this;
        const [nextRoute, nextParams] = this.matchRoute(path);

        const nextRouteStack = [] as RouteConfig[];
        for (
            let currentRoute = nextRoute;
            currentRoute;
            currentRoute = this.routeIndex[currentRoute.parent]
        ) {
            nextRouteStack.unshift(currentRoute);
        }

        const prevRouteStack = [] as RouteConfig[];
        for (
            let currentRoute = prevRoute;
            currentRoute;
            currentRoute = this.routeIndex[currentRoute.parent]
        ) {
            prevRouteStack.unshift(currentRoute);
        }

        const state = { prevStack: prevRouteStack.map(r => r.name), prevParams, nextStack: nextRouteStack.map(r => r.name), nextParams, context } as RouteState;

        const registerTransitionHook = (hook: RouterHook) => this.registerTransitionHook(hook);


        for (let handler of this.transitionHookStack.splice(0)) {
            if (handler) await handler.call(this, state);
        }


        for (
            let routeIndex = 0, routeCount = Math.max(prevRouteStack.length, nextRouteStack.length);
            routeIndex < routeCount;
            routeIndex++
        ) {
            const prevRoute = routeIndex < prevRouteStack.length && prevRouteStack[routeIndex];
            const nextRoute = routeIndex < nextRouteStack.length && nextRouteStack[routeIndex];

            if (prevRoute && nextRoute && prevRoute === nextRoute) {
                const { routeIsChanging: handler} = prevRoute;
                if (handler) await handler.call(this, state);
            }
            else {
                if (prevRoute) {
                    const { isLeavingRoute: handler} = prevRoute;
                    if (handler) await handler.call(this, state);
                }

                if (nextRoute) {
                    const { isEnteringRoute: handler} = nextRoute;
                    if (handler) await handler.call(this, state);
                }
            }
        }


        let result = null;
        for (
            let routeIndex = nextRouteStack.length - 1;
            routeIndex >= 0;
            routeIndex--
        ) {
            const nextRoute = nextRouteStack[routeIndex];
            const { render: handler} = nextRoute;
            const child = result;
            if (handler) result = await handler.call(this, { ...state, ...{ child } });
        }


        for (
            let routeIndex = Math.max(prevRouteStack.length, nextRouteStack.length) - 1;
            routeIndex >= 0;
            routeIndex--
        ) {
            const prevRoute = routeIndex < prevRouteStack.length && prevRouteStack[routeIndex];
            const nextRoute = routeIndex < nextRouteStack.length && nextRouteStack[routeIndex];

            if (prevRoute && nextRoute && prevRoute === nextRoute) {
                const { routeHasChanged: handler} = prevRoute;
                if (handler) await handler.call(this, state);
            }
            else {
                if (nextRoute) {
                    const { hasEnteredRoute: handler} = nextRoute;
                    if (handler) await handler.call(this, state);
                }

                if (prevRoute) {
                    const { hasLeftRoute: handler} = prevRoute;
                    if (handler) await handler.call(this, state);
                }
            }
        }


        this.lastRoute = nextRoute;
        this.lastParams = nextParams;

        return result;
    }


    private matchRoute(path: string): [RouteConfig, any] {
        for (let [name, routePath] of Object.entries(this.routePathIndex)) {
            const params = routePath.match(path);
            if (params) {
                const route = this.routeIndex[name];
                return [route, params];
            }
        }
    }

}





