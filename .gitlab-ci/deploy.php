<?php
namespace Deployer;

require 'recipe/common.php';
require 'recipe/rsync.php';

// Global config
set('allow_anonymous_stats', false);

set('rsync',[
    'exclude'      => [
        '.git',
        'deploy.php',
    ],
    'exclude-file' => false,
    'include'      => [],
    'include-file' => false,
    'filter'       => [],
    'filter-file'  => false,
    'filter-perdir'=> false,
    'flags'        => 'rz',
    'options'      => ['delete'],
    'timeout'      => 60,
]);

set('rsync_src', __DIR__ . '/../dist');
set('rsync_dest','{{release_path}}');

// Hosts
host('demo')
    ->stage('demo')
    ->hostname('typesense@vpu01-demo.tugraz.at')
    ->set('deploy_path', '/home/typesense/public_html');

host('development')
    ->stage('development')
    ->hostname('typesense@vpu01-dev.tugraz.at')
    ->set('deploy_path', '/home/typesense/public_html');

host('production')
    ->stage('production')
    ->hostname('typesense@vpu01-prod.tugraz.at')
    ->set('deploy_path', '/home/typesense/public_html');

task('build', function () {
    $stage = get('stage');
    runLocally("yarn install");
    runLocally("APP_ENV=$stage yarn run build");
});

// Deploy task
task('deploy', [
    'deploy:info',
    'build',
    'deploy:prepare',
    'deploy:lock',
    'deploy:release',
    'rsync',
    'deploy:shared',
    'deploy:symlink',
    'deploy:unlock',
    'cleanup',
    'success',
]);
after('deploy:failed', 'deploy:unlock');