export async function handle(
  inp: { ideaId: string; authorEmail: string },
  _ctx: any,
  // the third paramter contains the gql client object
  { gql }: any,
) {
  // find the referenced idea from the typegraph
  const { data: { idea } } = await gql`
    query getIdeaAuthorEmail($ideaId: String!) {
      idea: i_get_idea(where: { id: $ideaId }) {
        authorEmail
      }
    }
  `.run({ ideaId: inp.ideaId });

  // we check if the idea exists
  if (!idea) {
    throw new Error(`no idea found under id ${inp.ideaId}`);
  }

  // and that the author and voter aren't the same
  if (inp.authorEmail == idea.authorEmail) {
    throw new Error(`author of idea can't vote for idea`);
  }

  // we persist the vote with another gql call
  const { data: { vote } } = await gql`
    mutation insertVote($ideaId: String!, $authorEmail: String!) {
      vote: i_create_vote(data: { 
          authorEmail: $authorEmail, 
          idea: { connect: { id: $ideaId } } 
      }) {
        id
      }
    }
  `.run(inp);
  return { voteId: vote.id };
}
