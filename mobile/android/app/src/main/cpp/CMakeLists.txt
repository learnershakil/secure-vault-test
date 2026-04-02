cmake_minimum_required(VERSION 3.4.1)

add_library(
        secrets-lib
        SHARED
        secrets.cpp)

find_library(
        log-lib
        log)

target_link_libraries(
        secrets-lib
        ${log-lib})
