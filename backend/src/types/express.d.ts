import {type user} from "../types"

declare global {
    namespace Express{
        export interface Request{
            user?: User;
}}}


