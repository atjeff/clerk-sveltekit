import { Clerk } from '@clerk/clerk-js'
import _initializeClerkClient, { DEFAULT_OPTIONS } from './initializeClerkClient.js'
import clerkStore from './store.js'

type Params = Parameters<typeof _initializeClerkClient>

export async function initializeClerkClient(
	key: Params[2],
	options: Params[3] = DEFAULT_OPTIONS
): Promise<void> {
	return _initializeClerkClient(clerkStore, Clerk, key, options)
}

export { clerkUI } from './clerkui.js'
export { clerkStore }
