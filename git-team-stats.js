const fs = require("fs");
const d3 = require("d3");
const git = require("nodegit");
const log = require("gitlog");
const date = require("date-and-time");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const CanvasModule = require("canvas");

var config = require("./config.json");

let cloneActions = Object.keys(config.repos).map(repo => {
  return new Promise(resolve => {
    var dir = repo;
    var url = config.repos[repo];

    git.Clone(url, dir);

    resolve(dir);
  });
});

let findCommitsByAuthor = (repo, author) => {
  return new Promise(resolve => {
    const options = {
      repo: repo,
      number: 2000000000,
      author: author,
      fields: ["hash", "subject", "authorName", "authorDate"],
      execOptions: {
        maxBuffer: 100000000 * 1024
      }
    };
    log(options, (error, commits) => {
      resolve({ author, commits });
    });
  });
};

let getReposAuthorsCommitsSummary = reposAuthorsCommits => {
  authorCommitsSummary = {};

  for (let repoAuthorsCommits of reposAuthorsCommits) {
    authorCommitsSummary[repoAuthorsCommits.repo] = {};
    authorCommitsSummary[repoAuthorsCommits.repo].commits = [];
    authorCommitsSummary[repoAuthorsCommits.repo].total = 0;

    for (let authorCommits of repoAuthorsCommits.authorsCommits) {
      authorCommits.total = authorCommits.commits.length;
      authorCommitsSummary[repoAuthorsCommits.repo].total +=
        authorCommits.total;
      for (let commit of authorCommits.commits) {
        let time = date.parse(
          commit.authorDate.substr(0, 19),
          "YYYY-MM-DD HH:mm:ss"
        );
        if (authorCommits.timeline == null) {
          authorCommits.timeline = {};
        }
        if (authorCommits.timeline[time.getFullYear()] == null) {
          authorCommits.timeline[time.getFullYear()] = {};
          authorCommits.timeline[time.getFullYear()].total = 0;
        }
        if (
          authorCommits.timeline[time.getFullYear()][time.getMonth()] == null
        ) {
          authorCommits.timeline[time.getFullYear()][time.getMonth()] = 0;
        }

        authorCommits.timeline[time.getFullYear()][time.getMonth()] += 1;
        authorCommits.timeline[time.getFullYear()].total += 1;
      }

      delete authorCommits.commits;

      authorCommitsSummary[repoAuthorsCommits.repo].commits.push(authorCommits);
    }
  }

  return authorCommitsSummary;
};

Promise.all(cloneActions)
  .then(async repos => {
    let reposAuthorsCommits = [];

    for (let repo of repos) {
      let repoAuthorsCommits = {};
      repoAuthorsCommits.repo = repo;
      repoAuthorsCommits.authorsCommits = [];

      let authors = Object.values(config.members);
      for (let author of authors) {
        let authorCommits = await findCommitsByAuthor(repo, author);
        repoAuthorsCommits.authorsCommits.push(authorCommits);
      }

      reposAuthorsCommits.push(repoAuthorsCommits);
    }

    return reposAuthorsCommits;
  })
  .then(reposAuthorsCommits => {
    return getReposAuthorsCommitsSummary(reposAuthorsCommits);
  })
  .then(authorCommitsSummary => {
    let canvas = new CanvasModule.createCanvas(1000, 500);
    let context = canvas.getContext("2d");
    let dom = new JSDOM();

    global.document = dom.window.document;

    let svg = d3.create("svg");

    canvas.createPNGStream().pipe(fs.createWriteStream("./canvas.png"));
    console.log(JSON.stringify(authorCommitsSummary, null, " "));
  });
