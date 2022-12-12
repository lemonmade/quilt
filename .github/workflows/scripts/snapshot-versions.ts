import {setFailed} from '@actions/core';
import {context, getOctokit} from '@actions/github';

const {graphql} = getOctokit(process.env.GITHUB_TOKEN!);

try {
  await run();
} catch (err) {
  setFailed(`Request failed with error ${err}`);
}

async function run() {
  console.log('REPO:');
  console.log(context.repo);

  console.log('ISSUE:');
  console.log(context.payload.issue);

  console.log('COMMENT:');
  console.log(context.payload.comment);

  console.log(await graphql('query { viewer { login } }'));

  const reaction = await addReaction('EYES');

  console.log(JSON.stringify(reaction, null, 2));

  const repositoryDetails = await getRepositoryDetails();

  console.log(JSON.stringify(repositoryDetails, null, 2));

  const permission =
    repositoryDetails.repository?.collaborators?.edges?.[0]?.permission;

  if (permission && !['WRITE', 'ADMIN'].includes(permission)) {
    const errorMessage =
      'Only users with write permission to the respository can create snapshot releases, sorry!';
    await addComment(errorMessage);
    setFailed(errorMessage);
    return;
  }

  if (repositoryDetails.repository?.isFork) {
    const errorMessage =
      'Snapshots cannot be created from forked repositories.';
    await addComment(errorMessage);
    setFailed(errorMessage);
    return;
  }
}

function getRepositoryDetails() {
  return graphql<{
    repository?: {
      isFork: boolean;
      collaborators: {edges: {permission: string}[]};
    };
  }>(
    `
      query RepositoryDetails(
        $owner: String!
        $repo: String!
        $username: String!
      ) {
        repository(owner: $owner, name: $repo) {
          isFork
          collaborators(first: 1, query: $username) {
            edges {
              permission
            }
          }
        }
      }
    `,
    {
      owner: context.repo.owner,
      repo: context.repo.repo,
      username: context.actor,
    },
  );
}

function addReaction(reaction: 'EYES' | 'ROCKET') {
  return graphql<{
    addReaction: {
      reaction?: {
        content: string;
        reactable: {
          url: string;
        };
      };
    };
  }>(
    `
      mutation AddReaction($subjectId: ID!) {
        addReaction(input: {subjectId: $subjectId, content: $reaction}) {
          reaction {
            content
            reactable {
              ... on IssueComment {
                url
              }
            }
          }
        }
      }
    `,
    {
      subjectId: context.payload.comment!.node_id,
      reaction,
    },
  );
}

function addComment(comment: string) {
  return graphql<{
    addComment: {
      commentEdge: {
        node: {
          url: string;
        };
      };
    };
  }>(
    `
      mutation AddComment($subjectId: ID!, $comment: String!) {
        addComment(input: {subjectId: $subjectId, body: $comment}) {
          commentEdge {
            node {
              url
            }
          }
        }
      }
    `,
    {
      subjectId: context.payload.issue!.node_id,
      comment,
    },
  );
}

export {};
