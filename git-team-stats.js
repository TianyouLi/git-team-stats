var fs   = require('fs');
var git  = require('nodegit');
var log  = require('gitlog');
var date = require('date-and-time');

var config = require('./config.json');

var cloneActions = Object.keys(config.repos).map(
		repo => {
				return new Promise(resolve => {
						var dir = repo;
						var url = config.repos[repo];
						
						git.Clone(url, dir);
						
						resolve(dir);
				});
		}
);

var findCommitsByAuthor = (repo, author) => {
		return new Promise(resolve => {
				const options = { repo: repo
													, number: 2000000000
													, author: author
													, fields: [
															'hash'
															, 'subject'
															, 'authorName'
															, 'authorDate'
													]
													, execOptions: {
															maxBuffer: 100000000 * 1024
													}
												};
				log(options, (error, commits) => {
						resolve({author, commits});
				});
		});
};

Promise.all(cloneActions).then(async repos => {
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
}).then(reposAuthorsCommits => {
		authorCommitsSummary = {};
		
		for (let repoAuthorsCommits of reposAuthorsCommits) {
				authorCommitsSummary[repoAuthorsCommits.repo] = [];
				
				for (let authorCommits of repoAuthorsCommits.authorsCommits) {
						authorCommits.total = authorCommits.commits.length;

						for (let commit of authorCommits.commits) {
								var time = date.parse(commit.authorDate.substr(0,19), 'YYYY-MM-DD HH:mm:ss');
								if (authorCommits.timeline == null) {
										authorCommits.timeline = {};
								}
								if (authorCommits.timeline[time.getFullYear()] == null) {
										authorCommits.timeline[time.getFullYear()] = {};
								}								
								if (authorCommits.timeline[time.getFullYear()][time.getMonth()] == null) {
										authorCommits.timeline[time.getFullYear()][time.getMonth()] = 0;
								}

								authorCommits.timeline[time.getFullYear()][time.getMonth()] +=1;
						}

						delete authorCommits.commits;

						authorCommitsSummary[repoAuthorsCommits.repo].push(authorCommits);
				}
		}

		return authorCommitsSummary;
}).then(authorCommitsSummary => {
		console.log(authorCommitsSummary);
});




