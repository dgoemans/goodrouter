import * as test from "blue-tape";
import { spy } from "sinon";
import { GoodRouter, RouteConfig, PathMatcher } from "./router";


test("path matcher", async t => {
    let matcher = null as PathMatcher;

    matcher = new PathMatcher("/aap/noot");
    t.deepEqual(matcher.match("/aap/noot"), {});
    t.deepEqual(matcher.match("/aap/noot/mies"), null);

    matcher = new PathMatcher("/:a/:b/:c");
    t.deepEqual(matcher.match("/aap/noot"), null);
    t.deepEqual(matcher.match("/aap/noot/mies"), { a: "aap", b: "noot", c: "mies" });
});


test("router path", async t => {
    const homeRoute = {
        path: "/",
        render: state => "home"
    } as RouteConfig;

    const routes = {
        homeRoute,
    };
    const r = new GoodRouter(routes);

    const result = await r.transition("/");

    t.equal(result, "home");
});


test("router pattern", async t => {
    const homeRoute = {
        path: "/home/:aap/noot",
        render: state => state
    } as RouteConfig;

    const routes = {
        homeRoute,
    };
    const r = new GoodRouter(routes);

    t.deepEqual(await r.transition("/home/123/noot"), {
        child: null,
        context: null,
        nextParams: { aap: "123" },
        prevParams: {},
    });

    t.deepEqual(await r.transition("/home/456/noot", { "ok": true }), {
        child: null,
        context: { "ok": true },
        nextParams: { aap: "456" },
        prevParams: { aap: "123" },
    });
});



test("router child", async t => {
    const rootRoute = {
        path: "/",
        render: state => ({ name: "root", child: state.child })
    } as RouteConfig;

    const homeRoute = {
        parent: "rootRoute",
        path: "/home",
        render: state => ({ name: "home", child: state.child })
    } as RouteConfig;

    const routes = {
        rootRoute,
        homeRoute,
    };
    const r = new GoodRouter(routes);

    t.deepEqual(await r.transition("/home"), {
        name: "root",
        child: {
            name: "home",
            child: null
        }
    });

});





test("router child", async t => {
    const rootRoute = {
        path: "/",
        render: state => ({ name: "root", child: state.child })
    } as RouteConfig;

    const homeRoute = {
        parent: "rootRoute",
        path: "/home",
        render: state => ({ name: "home", child: state.child })
    } as RouteConfig;

    const routes = {
        rootRoute,
        homeRoute,
    };
    const r = new GoodRouter(routes);

    t.deepEqual(await r.transition("/home"), {
        name: "root",
        child: {
            name: "home",
            child: null
        }
    });

});




test("router hooks", async t => {
    const hookSpy = spy();

    const rootRoute = {
        path: "/",
        render: state => ({ name: "root", child: state.child }),
        isEnteringRoute: hookSpy.bind(null, "root-isEnteringRoute"),
        hasEnteredRoute: hookSpy.bind(null, "root-hasEnteredRoute"),
        routeIsChanging: hookSpy.bind(null, "root-routeIsChanging"),
        routeHasChanged: hookSpy.bind(null, "root-routeHasChanged"),
        isLeavingRoute: hookSpy.bind(null, "root-isLeavingRoute"),
        hasLeftRoute: hookSpy.bind(null, "root-hasLeftRoute"),
    };

    const childRoute1 = {
        parent: "rootRoute",
        path: "/child1",
        render: state => ({ name: "child1", child: state.child }),
        isEnteringRoute: hookSpy.bind(null, "child1-isEnteringRoute"),
        hasEnteredRoute: hookSpy.bind(null, "child1-hasEnteredRoute"),
        routeIsChanging: hookSpy.bind(null, "child1-routeIsChanging"),
        routeHasChanged: hookSpy.bind(null, "child1-routeHasChanged"),
        isLeavingRoute: hookSpy.bind(null, "child1-isLeavingRoute"),
        hasLeftRoute: hookSpy.bind(null, "child1-hasLeftRoute"),
    };

    const childRoute2 = {
        parent: "rootRoute",
        path: "/child2",
        render: state => ({ name: "child2", child: state.child }),
        isEnteringRoute: hookSpy.bind(null, "child2-isEnteringRoute"),
        hasEnteredRoute: hookSpy.bind(null, "child2-hasEnteredRoute"),
        routeIsChanging: hookSpy.bind(null, "child2-routeIsChanging"),
        routeHasChanged: hookSpy.bind(null, "child2-routeHasChanged"),
        isLeavingRoute: hookSpy.bind(null, "child2-isLeavingRoute"),
        hasLeftRoute: hookSpy.bind(null, "child2-hasLeftRoute"),
    };

    const routes = {
        rootRoute,
        childRoute1,
        childRoute2,
    };

    const r = new GoodRouter(routes);


    hookSpy.reset();
    t.deepEqual(await r.transition("/child1"), {
        name: "root",
        child: {
            name: "child1",
            child: null
        }
    });
    t.deepEqual(hookSpy.args.map(([arg]) => arg), [
        "root-isEnteringRoute",
        "child1-isEnteringRoute",
        "child1-hasEnteredRoute",
        "root-hasEnteredRoute",
    ]);


    hookSpy.reset();
    t.deepEqual(await r.transition("/child2"), {
        name: "root",
        child: {
            name: "child2",
            child: null
        }
    });
    t.deepEqual(hookSpy.args.map(([arg]) => arg), [
        "root-routeIsChanging",
        "child1-isLeavingRoute",
        "child2-isEnteringRoute",
        "child2-hasEnteredRoute",
        "child1-hasLeftRoute",
        "root-routeHasChanged",
    ]);

});



