import {setFailed} from '@actions/core';
import {context, getOctokit} from '@actions/github';

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

  const {graphql} = getOctokit(process.env.GITHUB_TOKEN!);

  console.log(await graphql('query { viewer { login } }'));

  const reaction = await graphql(
    `
      mutation AddReaction($subjectId: ID!) {
        addReaction(input: {subjectId: $subjectId, content: EYES}) {
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
    },
  );

  console.log(JSON.stringify(reaction, null, 2));

  const repositoryDetails = await graphql<any>(
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

  console.log(JSON.stringify(repositoryDetails, null, 2));

  const permission = repositoryDetails.repository?.collaborators?.edges?.[0]?.permission;

  if (!['WRITE', 'ADMIN'].includes(permission)) {
    const errorMessage = 'Only users with write permission to the respository can create snapshot releases, sorry!';

    await graphql(
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
      `, {
        subjectId: context.payload.pull_request!.node_id,
        comment: errorMessage,
      },
    );
    
    setFailed(errorMessage);

    return;
  }

  if (repositoryDetails.repository?.isFork) {
    const errorMessage = 'Snapshots cannot be created from forked repositories.';

    await graphql(
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
      `, {
        subjectId: context.payload.issue!.node_id,
        comment: errorMessage,
      },
    );

    setFailed(errorMessage);

    return;
  }
}

export {};
