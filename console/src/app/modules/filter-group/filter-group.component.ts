import { Component, OnInit } from '@angular/core';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { TextQueryMethod } from 'src/app/proto/generated/zitadel/object_pb';
import {
  DisplayNameQuery,
  EmailQuery,
  SearchQuery as UserSearchQuery,
  StateQuery,
  UserNameQuery,
  UserState,
} from 'src/app/proto/generated/zitadel/user_pb';
import { GroupNameQuery, GroupState } from 'src/app/proto/generated/zitadel/group_pb';
import { FilterComponent } from '../filter/filter.component';

enum SubQuery {
  STATE,
  NAME
}

@Component({
  selector: 'cnsl-filter-group',
  templateUrl: './filter-group.component.html',
})
export class FilterGroupComponent extends FilterComponent implements OnInit {
  public SubQuery: any = SubQuery;
  public searchQueries: UserSearchQuery[] = [];

  public states: GroupState[] = [
    GroupState.GROUP_STATE_ACTIVE,
    GroupState.GROUP_STATE_INACTIVE,
  ];
  constructor(router: Router, route: ActivatedRoute) {
    super(router, route);
  }

  ngOnInit(): void {
    this.route.queryParams.pipe(take(1)).subscribe((params) => {
      const { filter } = params;
      if (filter) {
        const stringifiedFilters = filter as string;
        const filters: UserSearchQuery.AsObject[] = JSON.parse(stringifiedFilters) as UserSearchQuery.AsObject[];

        const userQueries = filters.map((filter) => {
          if (filter.displayNameQuery) {
            const userQuery = new UserSearchQuery();

            const displayNameQuery = new DisplayNameQuery();
            //displayNameQuery.setDisplayName(filter.displayNameQuery.displayName);
            //displayNameQuery.setMethod(filter.displayNameQuery.method);

            //userQuery.setGroupNameQuery(displayNameQuery);
            return userQuery;
          } else if (filter.stateQuery) {
            const userQuery = new UserSearchQuery();

            const stateQuery = new StateQuery();
            stateQuery.setState(filter.stateQuery.state);

            userQuery.setStateQuery(stateQuery);
            return userQuery;
          } else {
            return undefined;
          }
        });

        this.searchQueries = userQueries.filter((q) => q !== undefined) as UserSearchQuery[];
        this.filterChanged.emit(this.searchQueries ? this.searchQueries : []);
      }
    });
  }

  public changeCheckbox(subquery: SubQuery, event: MatCheckboxChange) {
    if (event.checked) {
      switch (subquery) {
        case SubQuery.STATE:
          const sq = new StateQuery();
          //sq.setState(GroupState.GROUP_STATE_ACTIVE);

          const s_sq = new UserSearchQuery();
          s_sq.setStateQuery(sq);

          this.searchQueries.push(s_sq);
          break;
        case SubQuery.NAME:
          const dnq = new GroupNameQuery();
          dnq.setMethod(TextQueryMethod.TEXT_QUERY_METHOD_CONTAINS_IGNORE_CASE);
          dnq.setName('');

          const dn_sq = new UserSearchQuery();
          //dn_sq.setGroupNameQuery(dnq);

          this.searchQueries.push(dn_sq);
          break;
      }
    } else {
      switch (subquery) {
        case SubQuery.STATE:
          const index_s = this.searchQueries.findIndex((q) => (q as UserSearchQuery).toObject().stateQuery !== undefined);
          if (index_s > -1) {
            this.searchQueries.splice(index_s, 1);
          }
          break;
        case SubQuery.NAME:
          const index_dn = this.searchQueries.findIndex(
            (q) => (q as UserSearchQuery).toObject().displayNameQuery !== undefined,
          );
          if (index_dn > -1) {
            this.searchQueries.splice(index_dn, 1);
          }
          break;
      }
    }
  }

  public setValue(subquery: SubQuery, query: any, event: any) {
    const value = event?.target?.value ?? event.value;
    switch (subquery) {
      case SubQuery.STATE:
        (query as StateQuery).setState(value);
        this.filterChanged.emit(this.searchQueries ? this.searchQueries : []);
        break;
      case SubQuery.NAME:
        (query as GroupNameQuery).setName(value);
        this.filterChanged.emit(this.searchQueries ? this.searchQueries : []);
        break;
    }
  }

  public getSubFilter(subquery: SubQuery): any {
    switch (subquery) {
      case SubQuery.STATE:
        const s = this.searchQueries.find((q) => (q as UserSearchQuery).toObject().stateQuery !== undefined);
        if (s) {
          return (s as UserSearchQuery).getStateQuery();
        } else {
          return undefined;
        }
      case SubQuery.NAME:
        const dn = this.searchQueries.find((q) => (q as UserSearchQuery).toObject().displayNameQuery !== undefined);
        if (dn) {
          //return (dn as UserSearchQuery).getGroupNameQuery();
        } else {
          return undefined;
        }
    }
  }

  public setMethod(query: any, event: any) {
    (query as UserNameQuery).setMethod(event.value);
    this.filterChanged.emit(this.searchQueries ? this.searchQueries : []);
  }

  public override emitFilter(): void {
    this.filterChanged.emit(this.searchQueries ? this.searchQueries : []);
    this.showFilter = false;
    this.filterOpen.emit(false);
  }

  public resetFilter(): void {
    this.searchQueries = [];
    this.emitFilter();
  }
}
