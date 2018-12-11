var fs  = require('fs');
var git = require('nodegit');
var log = require('gitlog');

var config = require('./config.json');

var cloneActions = Object.keys(config.repos).map(
		repo => {
				return new Promise(resolve => {
						var dir = repo;
						var url = config.repos[repo];
						
						console.log("clone repo " + url + " into " + dir);
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

var repoAuthorCommitsActions = Promise.all(cloneActions).then(repos => {
		return repos.map( repo => {
				var authorCommitsActions = Object.values(config.members).map( author => {
						return findCommitsByAuthor(repo, author);
				});

				return {repo, authorCommitsActions};
		});
}).then(repoAuthorCommitsActions => {
		repoAuthorCommitsActions.map( repoAuthorCommits => {
				Promise.all(repoAuthorCommits.authorCommitsActions).then(authorsCommits => {
						authorsCommits.map(authorCommits => {
								console.log(authorCommits.author);
								console.log(authorCommits.commits);
						});
				});
		});
});


