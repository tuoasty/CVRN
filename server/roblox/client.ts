import "server-only";
import axios, {AxiosError} from "axios";
import axiosRetry, {exponentialDelay} from "axios-retry";

export const robloxUsersApi = axios.create({
    baseURL: "https://users.roblox.com",
    timeout: 4000,
});

export const robloxThumbnailsApi = axios.create({
    baseURL: "https://thumbnails.roblox.com",
    timeout: 4000,
});

const retryCondition = (error: AxiosError): boolean => {
    if (!error.response) return true;
    const status = error.response.status;
    return status === 429 || (status >= 500 && status < 600);
};

const retryConfig = {
    retries: 3,
    retryDelay: exponentialDelay,
    retryCondition,
    shouldResetTimeout: true,
};

axiosRetry(robloxUsersApi, retryConfig);
axiosRetry(robloxThumbnailsApi, retryConfig);
