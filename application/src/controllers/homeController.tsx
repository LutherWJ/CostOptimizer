import type { Context } from "hono";
import { getAllTodos } from "../models/todos";
import Home from "../views/Home";

export const getHome = (c: Context) => {
    return c.html(<Home/>);
}

