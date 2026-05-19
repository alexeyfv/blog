import type { APIRoute } from 'astro'

export const prerender = true

export const GET: APIRoute = ({ redirect }) => redirect('/en/tags/', 308)
