import axios, { AxiosPromise, AxiosRequestConfig, AxiosResponse } from "axios";
import { exit } from "process";

import config from "../../config";
import { isVerbose } from "../../src/index";
import { RC_FILE_PATH, THUMBNAIL_PATH } from "../constants";
import {
    logError,
    logInfo,
    logWarn,
    prepareImage,
    readTokenFile,
} from "./index";

type HTTPVerbs = "get" | "post" | "put";

const getAppToken = (): string => {
    const token = readTokenFile(RC_FILE_PATH);
    if (!token) {
        logWarn("Please log in before proceeding:\n");
        exit(1);
    }
    return token;
};

const requestOptions = (
    method: HTTPVerbs,
    url: string
): {
    headers: { Authorization: string; "Content-Type": string };
    method: HTTPVerbs;
    url: string;
} => {
    if (isVerbose) {
        logInfo(`\nRequesting ${url}...\n\n`);
    }

    return {
        headers: {
            Authorization: `Bearer ${getAppToken()}`,
            "Content-Type": "application/json",
        },
        method,
        url,
    };
};

const buildRequestConfig = ({
    category,
    fileData,
    isPublic = false,
    method = "post",
    names,
    url,
}: {
    category?: string;
    fileData: string;
    isPublic?: boolean;
    method: string;
    names: {
        displayName: string;
        publishedName: string;
    };
    url: string;
}): AxiosRequestConfig => {
    const options = requestOptions(method as HTTPVerbs, url);
    const thumbnail = prepareImage(THUMBNAIL_PATH);

    return {
        ...options,
        data: {
            content: fileData,
            metadata: {
                category,
                isPublic,
                names,
                thumbnail,
            },
        },
    };
};

export const createBlockRequest = (
    names: {
        displayName: string;
        publishedName: string;
    },
    fileData: string,
    category: string
): AxiosPromise =>
    axios(
        buildRequestConfig({
            category,
            fileData,
            method: "post",
            names,
            url: `${config.blockRegistry.host}/blocks`,
        })
    );

export const updateBlockRequest = (
    names: {
        displayName: string;
        publishedName: string;
    },
    fileData: string,
    blockId: string,
    isPublic: boolean
): AxiosPromise =>
    axios(
        buildRequestConfig({
            fileData,
            isPublic,
            method: "put",
            names,
            url: `${config.blockRegistry.host}/blocks/${blockId}`,
        })
    );

export const getCategoryNames = async (): Promise<string[] | undefined> => {
    try {
        const url = `${config.blockRegistry.host}/categories`;
        return await axios(requestOptions("get", url)).then(
            (categories: AxiosResponse) =>
                categories.data.map(
                    (category: { id: string; name: string }) => category.name
                )
        );
    } catch (err) {
        logError(`Trouble reaching the categories service: ${err.message}`);
        exit(1);
    }
};

export const loginRequest = (
    username: string,
    password: string
): AxiosPromise => {
    const data = {
        audience: config.auth0Audience,
        client_id: config.auth0ClientId,
        grant_type: config.grant_type,
        password,
        realm: config.realm,
        scope: config.scope,
        username,
    };

    if (isVerbose) {
        logInfo(`\nRequesting ${config.loginUrl}...\n\n`);
    }

    return axios({ data, method: "post", url: config.loginUrl });
};
