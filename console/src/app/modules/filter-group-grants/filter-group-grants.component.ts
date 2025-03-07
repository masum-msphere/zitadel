import { Component, DestroyRef, OnInit } from '@angular/core';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { TextQueryMethod } from 'src/app/proto/generated/zitadel/object_pb';
import { GroupGrantOrgNameQuery, GroupGrantProjectNameQuery, GroupNameQuery, GroupGrantQuery, GroupGrantGroupNameQuery } from 'src/app/proto/generated/zitadel/group_pb';
import { FilterComponent } from '../filter/filter.component';

enum SubQuery {
  GROUPNAME,
  ORGNAME,
  PROJECTNAME,
}

@Component({
  selector: 'cnsl-filter-group-grants',
  templateUrl: './filter-group-grants.component.html',
  styleUrls: ['./filter-group-grants.component.scss'],
})
export class FilterGroupGrantsComponent extends FilterComponent implements OnInit {
  public SubQuery: any = SubQuery;
  public searchQueries: GroupGrantQuery[] = [];

  constructor(router: Router, route: ActivatedRoute, destroyRef: DestroyRef) {
    super(router, route, destroyRef);
  }

  ngOnInit(): void {
    this.route.queryParams.pipe(take(1)).subscribe((params) => {
      const { filter } = params;
      if (filter) {
        const stringifiedFilters = filter as string;
        const filters: GroupGrantQuery.AsObject[] = JSON.parse(stringifiedFilters) as GroupGrantQuery.AsObject[];

        const userQueries = filters.map((filter) => {
          if (filter.groupNameQuery) {
            const userGrantQuery = new GroupGrantQuery();

            const groupNameQuery = new GroupGrantGroupNameQuery();
            groupNameQuery.setGroupName(filter.groupNameQuery.groupName);
            groupNameQuery.setMethod(filter.groupNameQuery.method);

            userGrantQuery.setGroupNameQuery(groupNameQuery);
            return userGrantQuery;
          } else if (filter.orgNameQuery) {
            const userGrantQuery = new GroupGrantQuery();

            const orgNameQuery = new GroupGrantOrgNameQuery();
            orgNameQuery.setOrgName(filter.orgNameQuery.orgName);
            orgNameQuery.setMethod(filter.orgNameQuery.method);

            userGrantQuery.setOrgNameQuery(orgNameQuery);
            return userGrantQuery;
          } else if (filter.projectNameQuery) {
            const userGrantQuery = new GroupGrantQuery();

            const projectNameQuery = new GroupGrantProjectNameQuery();
            projectNameQuery.setProjectName(filter.projectNameQuery.projectName);

            userGrantQuery.setProjectNameQuery(projectNameQuery);
            return userGrantQuery;
          } else {
            return undefined;
          }
        });

        this.searchQueries = userQueries.filter((q) => q !== undefined) as GroupGrantQuery[];
        this.filterChanged.emit(this.searchQueries ? this.searchQueries : []);
      }
    });
  }

  public changeCheckbox(subquery: SubQuery, event: MatCheckboxChange) {
    if (event.checked) {
      switch (subquery) {
        case SubQuery.GROUPNAME:
          const unq = new GroupGrantGroupNameQuery();
          unq.setMethod(TextQueryMethod.TEXT_QUERY_METHOD_CONTAINS_IGNORE_CASE);
          unq.setGroupName('');

          const un_sq = new GroupGrantQuery();
          un_sq.setGroupNameQuery(unq);

          this.searchQueries.push(un_sq);
          break;

        case SubQuery.ORGNAME:
          const onq = new GroupGrantOrgNameQuery();
          onq.setMethod(TextQueryMethod.TEXT_QUERY_METHOD_CONTAINS_IGNORE_CASE);
          onq.setOrgName('');

          const on_sq = new GroupGrantQuery();
          on_sq.setOrgNameQuery(onq);

          this.searchQueries.push(on_sq);
          break;

        case SubQuery.PROJECTNAME:
          const pnq = new GroupGrantProjectNameQuery();
          pnq.setMethod(TextQueryMethod.TEXT_QUERY_METHOD_CONTAINS_IGNORE_CASE);
          pnq.setProjectName('');

          const pn_sq = new GroupGrantQuery();
          pn_sq.setProjectNameQuery(pnq);

          this.searchQueries.push(pn_sq);
          break;
      }
    } else {
      switch (subquery) {
        case SubQuery.GROUPNAME:
          const index_un = this.searchQueries.findIndex((q) => q.toObject().groupNameQuery !== undefined);
          if (index_un > -1) {
            this.searchQueries.splice(index_un, 1);
          }
          break;
        case SubQuery.ORGNAME:
          const index_on = this.searchQueries.findIndex((q) => q.toObject().orgNameQuery !== undefined);
          if (index_on > -1) {
            this.searchQueries.splice(index_on, 1);
          }
          break;
        case SubQuery.PROJECTNAME:
          const index_pn = this.searchQueries.findIndex((q) => q.toObject().projectNameQuery !== undefined);
          if (index_pn > -1) {
            this.searchQueries.splice(index_pn, 1);
          }
          break;
      }
    }
  }

  public setValue(subquery: SubQuery, query: any, event: any) {
    switch (subquery) {
      case SubQuery.GROUPNAME:
        (query as GroupGrantGroupNameQuery).setGroupName(event?.target?.value);
        this.filterChanged.emit(this.searchQueries ? this.searchQueries : []);
        break;
      case SubQuery.ORGNAME:
        (query as GroupGrantOrgNameQuery).setOrgName(event?.target?.value);
        this.filterChanged.emit(this.searchQueries ? this.searchQueries : []);
        break;
      case SubQuery.PROJECTNAME:
        (query as GroupGrantProjectNameQuery).setProjectName(event?.target?.value);
        this.filterChanged.emit(this.searchQueries ? this.searchQueries : []);
        break;
    }
  }

  public getSubFilter(subquery: SubQuery): any {
    switch (subquery) {
      case SubQuery.GROUPNAME:
        const un = this.searchQueries.find((q) => q.toObject().groupNameQuery !== undefined);
        if (un) {
          return un.getGroupNameQuery();
        } else {
          return undefined;
        }
      case SubQuery.ORGNAME:
        const e = this.searchQueries.find((q) => q.toObject().orgNameQuery !== undefined);
        if (e) {
          return e.getOrgNameQuery();
        } else {
          return undefined;
        }
      case SubQuery.PROJECTNAME:
        const pn = this.searchQueries.find((q) => q.toObject().projectNameQuery !== undefined);
        if (pn) {
          return pn.getProjectNameQuery();
        } else {
          return undefined;
        }
    }
  }

  public setMethod(query: any, event: any) {
    (query as GroupNameQuery).setMethod(event.value);
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
