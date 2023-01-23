import { expect, test, vi } from "vitest";
import {
	graphql,
	GraphQLList,
	GraphQLObjectType,
	GraphQLSchema,
	GraphQLString,
} from "graphql";

import { TestLoader } from "./util/test-loader";

test("should throw an error when key miss skip property", async () => {
	const spy = vi.fn().mockImplementation(() => null)
	const loader = new TestLoader(spy);

	const personType = new GraphQLObjectType({
		name: "Person",
		fields: () => ({
			otherFriends: {
				type: new GraphQLList(GraphQLString),
				async resolve() {
					await loader.loadMany({
						query: { test: "test" },
						projection: { lastName: 1 },
						limit: 15,
					});

					return ['Mario', 'Luigi']
				},
			},
		}),
	});

	const queryType = new GraphQLObjectType({
		name: "Query",
		fields: () => ({
			person: {
				type: personType,
				resolve: () => {
					return {};
				},
			},
		}),
	});

	const { errors, data } = await graphql({
		schema: new GraphQLSchema({
			types: [personType],
			query: queryType,
		}),
		source: `
      {
        person {
          otherFriends
        }
      }
    `,
	});

	expect(errors![0].message).toBe('Missing "skip" property in key');

	expect(spy).toHaveBeenCalledTimes(0);
});

test("should throw an error when key miss limit property", async () => {
	const spy = vi.fn().mockImplementation(() => null)
	const loader = new TestLoader(spy);

	const personType = new GraphQLObjectType({
		name: "Person",
		fields: () => ({
			friends: {
				type: new GraphQLList(GraphQLString),
				async resolve() {
					await loader.loadMany({
						query: { test: "test" },
						projection: { firstName: 1 },
						skip: 0,
					});

					return ['Mario', 'Luigi']
				},
			},
		}),
	});

	const queryType = new GraphQLObjectType({
		name: "Query",
		fields: () => ({
			person: {
				type: personType,
				resolve: () => {
					return {};
				},
			},
		}),
	});

	const { errors, data } = await graphql({
		schema: new GraphQLSchema({
			types: [personType],
			query: queryType,
		}),
		source: `
      {
        person {
          friends
        }
      }
    `,
	});

	expect(errors![0].message).toBe('Missing "limit" property in key');
	expect(spy).toHaveBeenCalledTimes(0);
});

test("should aggregate same queries projections and skip and limit", async () => {
	const spy = vi.fn().mockImplementation(() => null)
	const loader = new TestLoader(spy);

	const personType = new GraphQLObjectType({
		name: "Person",
		fields: () => ({
			friends: {
				type: new GraphQLList(GraphQLString),
				async resolve() {
					await loader.load({
						query: { test: "test" },
						projection: { firstName: 1 },
						skip: 0,
						limit: 10,
					});

					return ['Mario', 'Luigi']
				},
			},
			otherFriends: {
				type: new GraphQLList(GraphQLString),
				async resolve() {
					await loader.load({
						query: { test: "test" },
						projection: { lastName: 1 },
						skip: 5,
						limit: 15,
					});

					return ['Mario', 'Luigi']
				},
			},
		}),
	});

	const queryType = new GraphQLObjectType({
		name: "Query",
		fields: () => ({
			person: {
				type: personType,
				resolve: () => {
					return {};
				},
			},
		}),
	});

	const { errors, data } = await graphql({
		schema: new GraphQLSchema({
			types: [personType],
			query: queryType,
		}),
		source: `
      {
        person {
          friends
          otherFriends
        }
      }
    `,
	});

	expect(errors).toBe(undefined);

	expect(spy).toHaveBeenCalledOnce();
	expect(spy).toHaveBeenCalledWith({
		query: { test: "test" },
		projection: { firstName: 1, lastName: 1 },
		skip: 0,
		limit: 15,
	});

	expect(data!.person).toMatchObject({
		friends: ["Mario", "Luigi"],
		otherFriends: ["Mario", "Luigi"],
	});
});
